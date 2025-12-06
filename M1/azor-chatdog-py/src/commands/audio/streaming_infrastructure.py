"""
Streaming Infrastructure for Real-time TTS Audio Processing
Phase 3: Streaming Infrastructure Implementation

Provides progressive audio generation and playback capabilities with:
- Real-time audio chunk streaming
- Progressive text processing and synthesis
- Audio buffer management and synchronization
- Stream-aware audio playback coordination
"""

import asyncio
import time
import queue
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, AsyncGenerator, Callable, Union
from enum import Enum
import io

from cli import console


class StreamState(Enum):
    """Audio stream processing states"""
    IDLE = "idle"
    PROCESSING = "processing"  
    STREAMING = "streaming"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class AudioChunk:
    """Single audio chunk in streaming pipeline"""
    chunk_id: int
    audio_data: bytes
    duration_ms: float
    text_segment: str
    chunk_size: int
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def is_empty(self) -> bool:
        return len(self.audio_data) == 0
    
    def to_dict(self) -> dict:
        return {
            'chunk_id': self.chunk_id,
            'duration_ms': self.duration_ms,
            'text_segment': self.text_segment,
            'chunk_size': self.chunk_size,
            'timestamp': self.timestamp,
            'metadata': self.metadata
        }


@dataclass  
class StreamingConfig:
    """Configuration for streaming audio processing"""
    chunk_size_ms: int = 500  # Target chunk duration in milliseconds
    buffer_size: int = 10  # Number of chunks to buffer ahead
    streaming_enabled: bool = True
    progressive_playback: bool = True
    max_concurrent_chunks: int = 3
    chunk_overlap_ms: int = 50  # Overlap between chunks for smooth playback
    auto_play: bool = True
    playback_buffer_size: int = 5


class StreamingTTSEngine(ABC):
    """Abstract base class for streaming-capable TTS engines"""
    
    @abstractmethod
    async def synthesize_streaming(self, text: str, **kwargs) -> AsyncGenerator[AudioChunk, None]:
        """
        Generate audio chunks progressively from input text.
        
        Args:
            text: Input text to synthesize
            **kwargs: Engine-specific parameters
            
        Yields:
            AudioChunk: Progressive audio chunks as they're generated
        """
        pass
    
    @abstractmethod
    def supports_streaming(self) -> bool:
        """Check if this engine supports streaming synthesis"""
        pass
    
    @abstractmethod
    def get_optimal_chunk_size(self) -> int:
        """Get recommended chunk size in milliseconds for this engine"""
        pass


class AudioStreamBuffer:
    """
    Manages buffering and coordination of streaming audio chunks.
    Handles progressive audio delivery, buffering, and synchronization.
    """
    
    def __init__(self, config: StreamingConfig):
        self.config = config
        self._buffer = queue.Queue(maxsize=config.buffer_size)
        self._playback_queue = queue.Queue(maxsize=config.playback_buffer_size)
        self._state = StreamState.IDLE
        self._total_chunks = 0
        self._processed_chunks = 0
        self._current_chunk_id = 0
        self._lock = threading.RLock()
        self._stream_complete = False
        
        # Performance tracking
        self._stats = {
            'chunks_buffered': 0,
            'chunks_played': 0,
            'buffer_underruns': 0,
            'average_chunk_duration': 0.0,
            'total_streaming_time': 0.0,
            'start_time': None
        }
    
    def start_streaming(self):
        """Initialize streaming session"""
        with self._lock:
            self._state = StreamState.STREAMING
            self._stats['start_time'] = time.time()
            self._stream_complete = False
            console.print_info("🎵 Audio streaming started")
    
    def add_chunk(self, chunk: AudioChunk) -> bool:
        """
        Add audio chunk to buffer for progressive playback.
        
        Args:
            chunk: Audio chunk to buffer
            
        Returns:
            bool: True if chunk was successfully buffered
        """
        try:
            with self._lock:
                if self._state not in [StreamState.STREAMING, StreamState.PROCESSING]:
                    return False
                
                # Add to main buffer
                if not self._buffer.full():
                    self._buffer.put(chunk, timeout=0.1)
                    self._stats['chunks_buffered'] += 1
                    
                    # Also queue for playback if auto-play is enabled
                    if self.config.auto_play and not self._playback_queue.full():
                        self._playback_queue.put(chunk, timeout=0.1)
                    
                    console.print_info(f"🎵 Buffered chunk {chunk.chunk_id}: {chunk.duration_ms:.1f}ms, '{chunk.text_segment[:30]}...'")
                    return True
                else:
                    console.print_warning("⚠️ Audio buffer full, skipping chunk")
                    return False
                    
        except queue.Full:
            console.print_warning("⚠️ Buffer queue timeout")
            return False
    
    def get_next_chunk(self, timeout: float = 1.0) -> Optional[AudioChunk]:
        """
        Get next audio chunk for playback.
        
        Args:
            timeout: Maximum wait time for chunk availability
            
        Returns:
            AudioChunk or None if no chunk available
        """
        try:
            chunk = self._playback_queue.get(timeout=timeout)
            with self._lock:
                self._stats['chunks_played'] += 1
                if chunk.duration_ms > 0:
                    # Update average chunk duration
                    current_avg = self._stats['average_chunk_duration']
                    total_played = self._stats['chunks_played']
                    self._stats['average_chunk_duration'] = (
                        (current_avg * (total_played - 1) + chunk.duration_ms) / total_played
                    )
            
            console.print_info(f"🔊 Playing chunk {chunk.chunk_id}: {chunk.duration_ms:.1f}ms")
            return chunk
            
        except queue.Empty:
            if not self._stream_complete:
                with self._lock:
                    self._stats['buffer_underruns'] += 1
                console.print_warning("⚠️ Audio buffer underrun - waiting for more chunks")
            return None
    
    def complete_streaming(self):
        """Mark streaming as complete"""
        with self._lock:
            self._stream_complete = True
            self._state = StreamState.COMPLETED
            if self._stats['start_time']:
                self._stats['total_streaming_time'] = time.time() - self._stats['start_time']
            console.print_info("✅ Audio streaming completed")
    
    def get_buffer_status(self) -> dict:
        """Get current buffer status and statistics"""
        with self._lock:
            return {
                'state': self._state.value,
                'buffer_size': self._buffer.qsize(),
                'playback_queue_size': self._playback_queue.qsize(),
                'max_buffer_size': self.config.buffer_size,
                'max_playback_size': self.config.playback_buffer_size,
                'stream_complete': self._stream_complete,
                'stats': self._stats.copy()
            }
    
    def is_streaming_active(self) -> bool:
        """Check if streaming is currently active"""
        return self._state == StreamState.STREAMING and not self._stream_complete
    
    def has_buffered_content(self) -> bool:
        """Check if there's buffered content available for playback"""
        return not self._playback_queue.empty() or not self._buffer.empty()
    
    def reset(self):
        """Reset buffer state for new streaming session"""
        with self._lock:
            # Clear queues
            while not self._buffer.empty():
                try:
                    self._buffer.get_nowait()
                except queue.Empty:
                    break
            
            while not self._playback_queue.empty():
                try:
                    self._playback_queue.get_nowait()
                except queue.Empty:
                    break
            
            # Reset state
            self._state = StreamState.IDLE
            self._stream_complete = False
            self._current_chunk_id = 0
            
            # Reset stats
            self._stats = {
                'chunks_buffered': 0,
                'chunks_played': 0,
                'buffer_underruns': 0,
                'average_chunk_duration': 0.0,
                'total_streaming_time': 0.0,
                'start_time': None
            }
            
            console.print_info("🔄 Audio buffer reset")


class StreamingAudioManager:
    """
    Main coordinator for streaming audio processing.
    Orchestrates text chunking, TTS streaming, and progressive playback.
    """
    
    def __init__(self, tts_engine: StreamingTTSEngine, config: StreamingConfig = None):
        self.tts_engine = tts_engine
        self.config = config or StreamingConfig()
        self.buffer = AudioStreamBuffer(self.config)
        self._streaming_tasks = []
        self._playback_task = None
        self._is_streaming = False
        
    async def start_streaming_synthesis(
        self, 
        text: str, 
        language: str = 'pl',
        rate: int = 150,
        role: str = 'default',
        progress_callback: Optional[Callable[[AudioChunk], None]] = None
    ) -> AsyncGenerator[AudioChunk, None]:
        """
        Start streaming TTS synthesis with progressive chunk delivery.
        
        Args:
            text: Input text to synthesize
            language: Target language
            rate: Speech rate (WPM)
            role: Voice role/character
            progress_callback: Optional callback for chunk progress updates
            
        Yields:
            AudioChunk: Progressive audio chunks as they're generated
        """
        if not self.tts_engine.supports_streaming():
            console.print_error("❌ Engine does not support streaming")
            return
        
        console.print_info(f"🚀 Starting streaming synthesis for text: '{text[:50]}...'")
        self.buffer.start_streaming()
        self._is_streaming = True
        
        try:
            chunk_count = 0
            async for chunk in self.tts_engine.synthesize_streaming(
                text=text,
                language=language,
                rate=rate,
                role=role
            ):
                chunk_count += 1
                
                # Buffer chunk for playback
                if self.buffer.add_chunk(chunk):
                    # Call progress callback if provided
                    if progress_callback:
                        try:
                            progress_callback(chunk)
                        except Exception as e:
                            console.print_warning(f"⚠️ Progress callback error: {e}")
                    
                    yield chunk
                else:
                    console.print_warning(f"⚠️ Failed to buffer chunk {chunk.chunk_id}")
            
            console.print_info(f"✅ Streaming synthesis completed: {chunk_count} chunks generated")
            
        except Exception as e:
            console.print_error(f"❌ Streaming synthesis failed: {e}")
            raise
        finally:
            self.buffer.complete_streaming()
            self._is_streaming = False
    
    async def stream_and_play(
        self, 
        text: str, 
        **kwargs
    ) -> bool:
        """
        Stream TTS synthesis with simultaneous progressive playback.
        
        Args:
            text: Text to synthesize and play
            **kwargs: TTS parameters
            
        Returns:
            bool: True if streaming and playback completed successfully
        """
        if not self.config.progressive_playback:
            console.print_info("Progressive playback disabled, using standard synthesis")
            return False
        
        try:
            # Start streaming synthesis task
            streaming_task = asyncio.create_task(
                self._stream_audio_chunks(text, **kwargs)
            )
            
            # Start playback task if auto-play enabled
            if self.config.auto_play:
                playback_task = asyncio.create_task(
                    self._progressive_playback()
                )
                self._playback_task = playback_task
            
            # Wait for streaming to complete
            await streaming_task
            
            # Wait for playback to finish if running
            if self.config.auto_play and self._playback_task:
                await self._playback_task
            
            console.print_info("✅ Streaming and playback completed")
            return True
            
        except Exception as e:
            console.print_error(f"❌ Stream and play failed: {e}")
            return False
    
    async def _stream_audio_chunks(self, text: str, **kwargs):
        """Internal method for streaming audio chunk generation"""
        async for chunk in self.start_streaming_synthesis(text, **kwargs):
            # Chunks are automatically buffered in start_streaming_synthesis
            pass
    
    async def _progressive_playback(self):
        """Internal method for progressive audio playback"""
        console.print_info("🔊 Starting progressive playback")
        
        while self.buffer.is_streaming_active() or self.buffer.has_buffered_content():
            chunk = self.buffer.get_next_chunk(timeout=2.0)
            
            if chunk:
                # Simulate playback (would integrate with actual audio player)
                playback_duration = chunk.duration_ms / 1000.0
                console.print_info(f"🎵 Playing chunk {chunk.chunk_id} ({chunk.duration_ms:.1f}ms)")
                await asyncio.sleep(playback_duration)
            else:
                # Brief pause to prevent busy waiting
                await asyncio.sleep(0.1)
        
        console.print_info("✅ Progressive playback completed")
    
    def get_streaming_status(self) -> dict:
        """Get current streaming status and performance metrics"""
        return {
            'is_streaming': self._is_streaming,
            'engine_supports_streaming': self.tts_engine.supports_streaming(),
            'optimal_chunk_size': self.tts_engine.get_optimal_chunk_size(),
            'buffer_status': self.buffer.get_buffer_status(),
            'config': {
                'chunk_size_ms': self.config.chunk_size_ms,
                'buffer_size': self.config.buffer_size,
                'progressive_playback': self.config.progressive_playback,
                'auto_play': self.config.auto_play
            }
        }
    
    def reset_streaming(self):
        """Reset streaming state for new session"""
        self._is_streaming = False
        self.buffer.reset()
        if self._playback_task and not self._playback_task.done():
            self._playback_task.cancel()
        self._playback_task = None
        console.print_info("🔄 Streaming manager reset")


# Export main classes for external use
__all__ = [
    'StreamState',
    'AudioChunk', 
    'StreamingConfig',
    'StreamingTTSEngine',
    'AudioStreamBuffer',
    'StreamingAudioManager'
]
