"""
EdgeTTS Streaming Engine Implementation
Phase 3: Streaming-capable adapter for Microsoft Edge TTS

Extends EdgeTTSEngine with real-time streaming capabilities:
- Progressive text-to-speech synthesis
- Chunk-based audio generation
- Real-time audio streaming with buffering
- Integration with existing async batch optimization
"""

import os
import time
from typing import AsyncGenerator, List, Optional

from .EdgeTTSEngine import EdgeTTSEngine
from .streaming_infrastructure import (
    StreamingTTSEngine, AudioChunk, StreamingConfig
)
from .text_processor import TextChunker
from cli import console

try:
    import edge_tts
    HAVE_EDGE_TTS = True
except ImportError:
    edge_tts = None
    HAVE_EDGE_TTS = False


class EdgeTTSStreamingEngine(EdgeTTSEngine, StreamingTTSEngine):
    """
    Streaming-capable EdgeTTS engine that extends the base EdgeTTS functionality
    with real-time progressive audio synthesis and chunk-based delivery.
    """
    
    def __init__(self):
        super().__init__()
        self.text_chunker = TextChunker()
        self.streaming_config = StreamingConfig()
        self._streaming_stats = {
            'total_chunks_generated': 0,
            'total_streaming_time': 0.0,
            'average_chunk_generation_time': 0.0,
            'streaming_sessions': 0
        }
    
    def supports_streaming(self) -> bool:
        """EdgeTTS supports streaming through progressive synthesis"""
        return self.is_available and HAVE_EDGE_TTS
    
    def get_optimal_chunk_size(self) -> int:
        """Get optimal chunk size in milliseconds for EdgeTTS"""
        return self.streaming_config.chunk_size_ms
    
    async def synthesize_streaming(
        self, 
        text: str, 
        language: str = 'pl',
        rate: int = 150,
        role: str = 'default',
        **kwargs
    ) -> AsyncGenerator[AudioChunk, None]:
        """
        Generate audio chunks progressively from input text using EdgeTTS.
        
        Args:
            text: Input text to synthesize
            language: Target language (pl/en)
            rate: Speech rate in WPM
            role: Voice role (user/assistant/default)
            
        Yields:
            AudioChunk: Progressive audio chunks as they're synthesized
        """
        if not self.supports_streaming():
            console.print_error("❌ EdgeTTS streaming not available")
            return
        
        console.print_info(f"🎵 Starting EdgeTTS streaming synthesis for: '{text[:50]}...'")
        session_start_time = time.time()
        
        try:
            # Split text into streaming chunks
            text_chunks = self._prepare_streaming_chunks(text)
            console.print_info(f"📝 Text split into {len(text_chunks)} streaming chunks")
            
            # Get voice configuration
            voice = self._get_voice_for_language_and_role(language, role)
            rate_str = self._calculate_streaming_rate_string(rate)
            
            console.print_info(f"🎤 Using voice: {voice}, rate: {rate_str}")
            
            # Process each text chunk as audio chunk
            for chunk_id, text_chunk in enumerate(text_chunks):
                chunk_start_time = time.time()
                
                try:
                    audio_chunk = await self._synthesize_text_chunk(
                        chunk_id=chunk_id,
                        text_chunk=text_chunk,
                        voice=voice,
                        rate_str=rate_str,
                        language=language,
                        role=role
                    )
                    
                    if audio_chunk:
                        # Update streaming statistics
                        chunk_generation_time = time.time() - chunk_start_time
                        self._update_streaming_stats(chunk_generation_time)
                        
                        console.print_info(
                            f"✅ Generated streaming chunk {chunk_id}: "
                            f"{audio_chunk.duration_ms:.1f}ms, {audio_chunk.chunk_size} bytes"
                        )
                        
                        yield audio_chunk
                    else:
                        console.print_warning(f"⚠️ Failed to generate chunk {chunk_id}")
                
                except Exception as e:
                    console.print_error(f"❌ Error generating chunk {chunk_id}: {e}")
                    # Continue with next chunk instead of failing entire stream
                    continue
            
            # Update session statistics
            total_session_time = time.time() - session_start_time
            self._streaming_stats['total_streaming_time'] += total_session_time
            self._streaming_stats['streaming_sessions'] += 1
            
            console.print_info(
                f"✅ EdgeTTS streaming completed: "
                f"{len(text_chunks)} chunks in {total_session_time:.2f}s"
            )
            
        except Exception as e:
            console.print_error(f"❌ EdgeTTS streaming synthesis failed: {e}")
            raise
    
    def _prepare_streaming_chunks(self, text: str) -> List[str]:
        """
        Prepare text for streaming by splitting into optimal chunks.
        Uses smart sentence boundary detection for smooth streaming.
        """
        # Use existing text chunker with streaming-optimized settings
        chunks = self.text_chunker.chunk_text(
            text=text,
            max_chunk_length=self._calculate_optimal_text_chunk_size()
        )
        
        # Filter out empty chunks
        chunks = [chunk.strip() for chunk in chunks if chunk.strip()]
        
        console.print_info(f"📝 Prepared {len(chunks)} streaming text chunks")
        return chunks
    
    def _calculate_optimal_text_chunk_size(self) -> int:
        """Calculate optimal text chunk size for streaming based on target audio duration"""
        # Estimate: ~150 WPM average, ~5 chars per word, target 500ms chunks
        target_duration_ms = self.streaming_config.chunk_size_ms
        estimated_chars_per_second = (150 * 5) / 60  # ~12.5 chars/second
        optimal_chars = int((target_duration_ms / 1000) * estimated_chars_per_second)
        
        # Ensure reasonable bounds (50-200 characters per chunk)
        return max(50, min(200, optimal_chars))
    
    async def _synthesize_text_chunk(
        self,
        chunk_id: int,
        text_chunk: str,
        voice: str,
        rate_str: str,
        language: str,
        role: str
    ) -> Optional[AudioChunk]:
        """
        Synthesize a single text chunk into an audio chunk.
        """
        try:
            # Create temporary file for this chunk
            temp_mp3_path = f"/tmp/streaming_chunk_{chunk_id}_{int(time.time())}.mp3"
            temp_wav_path = f"/tmp/streaming_chunk_{chunk_id}_{int(time.time())}.wav"
            
            # Generate MP3 using EdgeTTS
            communicate = edge_tts.Communicate(
                text=text_chunk,
                voice=voice,
                rate=rate_str
            )
            
            await communicate.save(temp_mp3_path)
            
            # Verify MP3 was created
            if not os.path.exists(temp_mp3_path) or os.path.getsize(temp_mp3_path) == 0:
                console.print_error(f"❌ EdgeTTS failed to generate MP3 for chunk {chunk_id}")
                return None
            
            # Convert MP3 to WAV for consistent audio format
            conversion_success = self._convert_mp3_to_wav(temp_mp3_path, temp_wav_path)
            
            if not conversion_success or not os.path.exists(temp_wav_path):
                console.print_error(f"❌ Failed to convert chunk {chunk_id} to WAV")
                return None
            
            # Read WAV audio data
            with open(temp_wav_path, 'rb') as f:
                audio_data = f.read()
            
            # Calculate audio duration (estimation based on WAV file size)
            duration_ms = self._estimate_audio_duration(audio_data, temp_wav_path)
            
            # Create AudioChunk object
            audio_chunk = AudioChunk(
                chunk_id=chunk_id,
                audio_data=audio_data,
                duration_ms=duration_ms,
                text_segment=text_chunk,
                chunk_size=len(audio_data),
                metadata={
                    'voice': voice,
                    'rate': rate_str,
                    'language': language,
                    'role': role,
                    'engine': 'EdgeTTS'
                }
            )
            
            # Cleanup temporary files
            self._cleanup_temp_files([temp_mp3_path, temp_wav_path])
            
            return audio_chunk
            
        except Exception as e:
            console.print_error(f"❌ Error synthesizing chunk {chunk_id}: {e}")
            # Cleanup on error
            self._cleanup_temp_files([temp_mp3_path, temp_wav_path])
            return None
    
    def _estimate_audio_duration(self, audio_data: bytes, wav_path: str) -> float:
        """
        Estimate audio duration in milliseconds from WAV file.
        Uses file size estimation as fallback if unable to parse WAV header.
        """
        try:
            # Try to get accurate duration by parsing WAV header
            # For simplicity, we'll use file size estimation
            # Typical WAV: 44.1kHz, 16-bit, mono = ~88KB per second
            estimated_duration_seconds = len(audio_data) / (44100 * 2)  # 2 bytes per sample
            return estimated_duration_seconds * 1000  # Convert to milliseconds
            
        except Exception as e:
            console.print_warning(f"⚠️ Could not estimate duration accurately: {e}")
            # Fallback: assume ~100ms per 10KB of audio data
            return (len(audio_data) / 10240) * 100
    
    def _get_voice_for_language_and_role(self, language: str, role: str) -> str:
        """Get appropriate EdgeTTS voice based on language and role"""
        if language.lower() in ['pl', 'polish']:
            if role.lower() == 'user':
                return "pl-PL-MarekNeural"  # Polish male voice
            else:
                return "pl-PL-ZofiaNeural"  # Polish female voice
        else:
            if role.lower() == 'user':
                return "en-US-ChristopherNeural"  # English male voice
            else:
                return "en-US-AriaNeural"  # English female voice
    
    def _calculate_streaming_rate_string(self, rate: int) -> str:
        """Calculate EdgeTTS rate string for streaming (same as base engine)"""
        if rate < 150:
            speed_percentage = max(-50, ((rate - 150) / 150) * 100)
        else:
            speed_percentage = min(100, ((rate - 150) / 150) * 100)
        
        return f"{speed_percentage:+.0f}%"
    
    def _cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files safely"""
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.unlink(path)
            except Exception as e:
                console.print_warning(f"⚠️ Could not cleanup temp file {path}: {e}")
    
    def _update_streaming_stats(self, chunk_generation_time: float):
        """Update streaming performance statistics"""
        self._streaming_stats['total_chunks_generated'] += 1
        
        # Update average chunk generation time
        total_chunks = self._streaming_stats['total_chunks_generated']
        current_avg = self._streaming_stats['average_chunk_generation_time']
        new_avg = ((current_avg * (total_chunks - 1)) + chunk_generation_time) / total_chunks
        self._streaming_stats['average_chunk_generation_time'] = new_avg
    
    def get_streaming_stats(self) -> dict:
        """Get streaming performance statistics"""
        stats = self._streaming_stats.copy()
        stats.update({
            'supports_streaming': self.supports_streaming(),
            'optimal_chunk_size_ms': self.get_optimal_chunk_size(),
            'streaming_config': {
                'chunk_size_ms': self.streaming_config.chunk_size_ms,
                'buffer_size': self.streaming_config.buffer_size,
                'max_concurrent_chunks': self.streaming_config.max_concurrent_chunks
            }
        })
        return stats
    
    def reset_streaming_stats(self):
        """Reset streaming statistics"""
        self._streaming_stats = {
            'total_chunks_generated': 0,
            'total_streaming_time': 0.0,
            'average_chunk_generation_time': 0.0,
            'streaming_sessions': 0
        }
        console.print_info("🔄 EdgeTTS streaming stats reset")


# Factory function to create streaming-enabled EdgeTTS engine
def create_streaming_edgetts_engine() -> EdgeTTSStreamingEngine:
    """
    Create and initialize a streaming-capable EdgeTTS engine.
    
    Returns:
        EdgeTTSStreamingEngine: Ready-to-use streaming TTS engine
    """
    engine = EdgeTTSStreamingEngine()
    if engine.is_available:
        console.print_info("✅ EdgeTTS Streaming Engine initialized successfully")
    else:
        console.print_warning("⚠️ EdgeTTS Streaming Engine initialization failed")
    
    return engine


# Export main classes
__all__ = ['EdgeTTSStreamingEngine', 'create_streaming_edgetts_engine']
