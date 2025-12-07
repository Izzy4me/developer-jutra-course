"""
Progressive Audio Playback System
Phase 4: Real-time audio playback for streaming TTS

Provides real-time audio playback capabilities with:
- Cross-platform audio playback (pygame/pyaudio)
- Progressive chunk-based playback
- Smooth audio transitions between chunks
- Volume control and playback management
- Synchronization with streaming synthesis
"""

import asyncio
import threading
import time
import queue
import wave
import io
from typing import Optional, List, Callable, Dict, Any
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from cli import console
from .streaming_infrastructure import AudioChunk, StreamState

# Check for audio libraries
try:
    import pygame
    pygame.mixer.pre_init(frequency=44100, size=-16, channels=1, buffer=1024)
    pygame.mixer.init()
    HAVE_PYGAME = True
    console.print_info("🎵 Pygame audio available")
except ImportError:
    HAVE_PYGAME = False
    console.print_warning("⚠️ Pygame not available")

try:
    import pyaudio
    HAVE_PYAUDIO = True
    console.print_info("🔊 PyAudio available")
except ImportError:
    HAVE_PYAUDIO = False
    console.print_warning("⚠️ PyAudio not available")


class PlaybackState(Enum):
    """Audio playback states"""
    STOPPED = "stopped"
    PLAYING = "playing"
    PAUSED = "paused"
    BUFFERING = "buffering"
    FINISHED = "finished"
    ERROR = "error"


@dataclass
class PlaybackConfig:
    """Configuration for audio playback"""
    sample_rate: int = 44100
    channels: int = 1
    sample_width: int = 2  # 16-bit
    buffer_size: int = 1024
    crossfade_ms: int = 50  # Crossfade between chunks
    volume: float = 0.8  # Volume level (0.0 to 1.0)
    auto_play: bool = True
    playback_engine: str = "auto"  # "pygame", "pyaudio", "auto"


class AudioPlaybackEngine:
    """Abstract base for audio playback engines"""
    
    def __init__(self, config: PlaybackConfig):
        self.config = config
        self.state = PlaybackState.STOPPED
        self._volume = config.volume
    
    def play_chunk(self, audio_data: bytes) -> bool:
        """Play audio chunk"""
        raise NotImplementedError
    
    def stop(self):
        """Stop playback"""
        raise NotImplementedError
    
    def pause(self):
        """Pause playback"""
        raise NotImplementedError
    
    def resume(self):
        """Resume playback"""
        raise NotImplementedError
    
    def set_volume(self, volume: float):
        """Set volume (0.0 to 1.0)"""
        self._volume = max(0.0, min(1.0, volume))


class PygamePlaybackEngine(AudioPlaybackEngine):
    """Pygame-based audio playback engine"""
    
    def __init__(self, config: PlaybackConfig):
        super().__init__(config)
        if not HAVE_PYGAME:
            raise RuntimeError("Pygame not available")
        
        self._mixer_initialized = False
        self._current_sound = None
        self._initialize_mixer()
    
    def _initialize_mixer(self):
        """Initialize pygame mixer with optimal settings"""
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.pre_init(
                    frequency=self.config.sample_rate,
                    size=-16,  # 16-bit signed
                    channels=self.config.channels,
                    buffer=self.config.buffer_size
                )
                pygame.mixer.init()
            
            self._mixer_initialized = True
            console.print_info("✅ Pygame mixer initialized")
        except Exception as e:
            console.print_error(f"❌ Pygame mixer initialization failed: {e}")
            raise
    
    def play_chunk(self, audio_data: bytes) -> bool:
        """Play audio chunk using pygame"""
        try:
            if not self._mixer_initialized:
                return False
            
            # Create sound from audio data
            sound_buffer = io.BytesIO(audio_data)
            self._current_sound = pygame.mixer.Sound(sound_buffer)
            
            # Set volume
            self._current_sound.set_volume(self._volume)
            
            # Play sound
            channel = self._current_sound.play()
            
            if channel:
                self.state = PlaybackState.PLAYING
                
                # Wait for playback to complete (non-blocking)
                def wait_for_completion():
                    while channel.get_busy():
                        time.sleep(0.01)
                    self.state = PlaybackState.FINISHED
                
                threading.Thread(target=wait_for_completion, daemon=True).start()
                return True
            
            return False
            
        except Exception as e:
            console.print_error(f"❌ Pygame playback error: {e}")
            self.state = PlaybackState.ERROR
            return False
    
    def stop(self):
        """Stop pygame playback"""
        pygame.mixer.stop()
        self.state = PlaybackState.STOPPED
    
    def pause(self):
        """Pause pygame playback"""
        pygame.mixer.pause()
        self.state = PlaybackState.PAUSED
    
    def resume(self):
        """Resume pygame playback"""
        pygame.mixer.unpause()
        self.state = PlaybackState.PLAYING
    
    def set_volume(self, volume: float):
        """Set pygame volume"""
        super().set_volume(volume)
        if self._current_sound:
            self._current_sound.set_volume(self._volume)


class PyAudioPlaybackEngine(AudioPlaybackEngine):
    """PyAudio-based audio playback engine"""
    
    def __init__(self, config: PlaybackConfig):
        super().__init__(config)
        if not HAVE_PYAUDIO:
            raise RuntimeError("PyAudio not available")
        
        self.pa = pyaudio.PyAudio()
        self.stream = None
        self._initialize_stream()
    
    def _initialize_stream(self):
        """Initialize PyAudio stream"""
        try:
            self.stream = self.pa.open(
                format=pyaudio.paInt16,
                channels=self.config.channels,
                rate=self.config.sample_rate,
                output=True,
                frames_per_buffer=self.config.buffer_size
            )
            console.print_info("✅ PyAudio stream initialized")
        except Exception as e:
            console.print_error(f"❌ PyAudio stream initialization failed: {e}")
            raise
    
    def play_chunk(self, audio_data: bytes) -> bool:
        """Play audio chunk using PyAudio"""
        try:
            if not self.stream or self.stream.is_stopped():
                return False
            
            self.state = PlaybackState.PLAYING
            
            # Apply volume scaling
            if self._volume != 1.0:
                # Simple volume scaling (not ideal, but functional)
                import numpy as np
                audio_array = np.frombuffer(audio_data, dtype=np.int16)
                audio_array = (audio_array * self._volume).astype(np.int16)
                audio_data = audio_array.tobytes()
            
            # Write audio data to stream
            self.stream.write(audio_data)
            
            self.state = PlaybackState.FINISHED
            return True
            
        except Exception as e:
            console.print_error(f"❌ PyAudio playback error: {e}")
            self.state = PlaybackState.ERROR
            return False
    
    def stop(self):
        """Stop PyAudio playback"""
        if self.stream and not self.stream.is_stopped():
            self.stream.stop_stream()
        self.state = PlaybackState.STOPPED
    
    def pause(self):
        """Pause PyAudio playback (not directly supported)"""
        self.stop()  # PyAudio doesn't support pause/resume directly
        self.state = PlaybackState.PAUSED
    
    def resume(self):
        """Resume PyAudio playback"""
        if self.stream and self.stream.is_stopped():
            self.stream.start_stream()
        self.state = PlaybackState.PLAYING
    
    def __del__(self):
        """Clean up PyAudio resources"""
        if self.stream:
            self.stream.close()
        if self.pa:
            self.pa.terminate()


class ProgressiveAudioPlayer:
    """
    Progressive audio player for streaming TTS chunks.
    Handles smooth playback of audio chunks with buffering and transitions.
    """
    
    def __init__(self, config: PlaybackConfig = None):
        self.config = config or PlaybackConfig()
        self.playback_engine = None
        self.state = PlaybackState.STOPPED
        
        # Playback management
        self._playback_queue = queue.Queue()
        self._playback_thread = None
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()
        
        # Statistics
        self._stats = {
            'chunks_played': 0,
            'total_playback_time': 0.0,
            'buffer_underruns': 0,
            'playback_errors': 0,
            'average_chunk_duration': 0.0
        }
        
        # Initialize playback engine
        self._initialize_playback_engine()
    
    def _initialize_playback_engine(self):
        """Initialize the best available audio playback engine"""
        engine_type = self.config.playback_engine.lower()
        
        if engine_type == "auto":
            # Auto-select best available engine
            if HAVE_PYGAME:
                engine_type = "pygame"
            elif HAVE_PYAUDIO:
                engine_type = "pyaudio"
            else:
                console.print_error("❌ No audio playback engines available")
                return False
        
        try:
            if engine_type == "pygame" and HAVE_PYGAME:
                self.playback_engine = PygamePlaybackEngine(self.config)
                console.print_info("✅ Using Pygame playback engine")
            elif engine_type == "pyaudio" and HAVE_PYAUDIO:
                self.playback_engine = PyAudioPlaybackEngine(self.config)
                console.print_info("✅ Using PyAudio playback engine")
            else:
                console.print_error(f"❌ Requested playback engine '{engine_type}' not available")
                return False
            
            return True
            
        except Exception as e:
            console.print_error(f"❌ Failed to initialize {engine_type} playback engine: {e}")
            return False
    
    def start_progressive_playback(self):
        """Start progressive playback thread"""
        if self._playback_thread and self._playback_thread.is_alive():
            console.print_warning("⚠️ Playback already running")
            return
        
        self._stop_event.clear()
        self._pause_event.clear()
        self._playback_thread = threading.Thread(target=self._playback_worker, daemon=True)
        self._playback_thread.start()
        
        self.state = PlaybackState.BUFFERING
        console.print_info("🎵 Progressive playback started")
    
    def _playback_worker(self):
        """Worker thread for progressive audio playback"""
        console.print_info("🔊 Playback worker thread started")
        
        while not self._stop_event.is_set():
            try:
                # Wait for audio chunk
                chunk = self._playback_queue.get(timeout=1.0)
                
                if chunk is None:  # Shutdown signal
                    break
                
                # Handle pause
                while self._pause_event.is_set() and not self._stop_event.is_set():
                    time.sleep(0.1)
                
                if self._stop_event.is_set():
                    break
                
                # Play audio chunk
                start_time = time.time()
                success = self._play_audio_chunk(chunk)
                playback_duration = time.time() - start_time
                
                # Update statistics
                if success:
                    self._stats['chunks_played'] += 1
                    self._stats['total_playback_time'] += playback_duration
                    
                    # Update average chunk duration
                    if chunk.duration_ms > 0:
                        current_avg = self._stats['average_chunk_duration']
                        total_played = self._stats['chunks_played']
                        self._stats['average_chunk_duration'] = (
                            (current_avg * (total_played - 1) + chunk.duration_ms) / total_played
                        )
                else:
                    self._stats['playback_errors'] += 1
                
            except queue.Empty:
                # No chunks available - this is normal during streaming gaps
                if self.state == PlaybackState.PLAYING:
                    self.state = PlaybackState.BUFFERING
                    self._stats['buffer_underruns'] += 1
                continue
            
            except Exception as e:
                console.print_error(f"❌ Playback worker error: {e}")
                self._stats['playback_errors'] += 1
        
        self.state = PlaybackState.STOPPED
        console.print_info("🔊 Playback worker thread stopped")
    
    def _play_audio_chunk(self, chunk: AudioChunk) -> bool:
        """Play a single audio chunk"""
        if not self.playback_engine:
            console.print_error("❌ No playback engine available")
            return False
        
        try:
            console.print_info(f"🎵 Playing chunk {chunk.chunk_id}: {chunk.duration_ms:.1f}ms")
            
            # Extract WAV audio data for playback
            audio_data = self._extract_wav_data(chunk.audio_data)
            if not audio_data:
                console.print_error(f"❌ Could not extract audio data from chunk {chunk.chunk_id}")
                return False
            
            # Play through engine
            success = self.playback_engine.play_chunk(audio_data)
            
            if success:
                self.state = PlaybackState.PLAYING
                
                # Wait for chunk duration (simulated real-time playback)
                expected_duration = chunk.duration_ms / 1000.0
                time.sleep(expected_duration)
                
                console.print_info(f"✅ Completed playback of chunk {chunk.chunk_id}")
            else:
                console.print_warning(f"⚠️ Failed to play chunk {chunk.chunk_id}")
            
            return success
            
        except Exception as e:
            console.print_error(f"❌ Error playing chunk {chunk.chunk_id}: {e}")
            return False
    
    def _extract_wav_data(self, audio_data: bytes) -> Optional[bytes]:
        """Extract raw PCM data from WAV file bytes"""
        try:
            # Create BytesIO from audio data
            wav_buffer = io.BytesIO(audio_data)
            
            # Read WAV file
            with wave.open(wav_buffer, 'rb') as wav_file:
                # Verify format compatibility
                if (wav_file.getnchannels() != self.config.channels or
                    wav_file.getsampwidth() != self.config.sample_width or
                    wav_file.getframerate() != self.config.sample_rate):
                    
                    console.print_warning("⚠️ Audio format mismatch - attempting conversion")
                    # For now, proceed anyway - could add conversion here
                
                # Extract raw PCM data
                pcm_data = wav_file.readframes(wav_file.getnframes())
                return pcm_data
        
        except Exception as e:
            console.print_error(f"❌ WAV data extraction error: {e}")
            return None
    
    def queue_chunk(self, chunk: AudioChunk) -> bool:
        """Queue audio chunk for playback"""
        try:
            self._playback_queue.put(chunk, timeout=0.1)
            console.print_info(f"📥 Queued chunk {chunk.chunk_id} for playback")
            return True
        except queue.Full:
            console.print_warning("⚠️ Playbook queue full, dropping chunk")
            return False
    
    def stop_playback(self):
        """Stop progressive playback"""
        self._stop_event.set()
        
        if self.playback_engine:
            self.playback_engine.stop()
        
        # Signal shutdown
        try:
            self._playback_queue.put(None, timeout=0.1)
        except queue.Full:
            pass
        
        # Wait for thread to complete
        if self._playback_thread and self._playback_thread.is_alive():
            self._playback_thread.join(timeout=2.0)
        
        self.state = PlaybackState.STOPPED
        console.print_info("⏹️ Progressive playback stopped")
    
    def pause_playback(self):
        """Pause progressive playback"""
        self._pause_event.set()
        if self.playback_engine:
            self.playback_engine.pause()
        self.state = PlaybackState.PAUSED
        console.print_info("⏸️ Progressive playback paused")
    
    def resume_playback(self):
        """Resume progressive playback"""
        self._pause_event.clear()
        if self.playback_engine:
            self.playback_engine.resume()
        self.state = PlaybackState.PLAYING
        console.print_info("▶️ Progressive playback resumed")
    
    def set_volume(self, volume: float):
        """Set playback volume"""
        self.config.volume = max(0.0, min(1.0, volume))
        if self.playback_engine:
            self.playback_engine.set_volume(self.config.volume)
        console.print_info(f"🔊 Volume set to {self.config.volume:.1%}")
    
    def get_playback_stats(self) -> dict:
        """Get playback performance statistics"""
        stats = self._stats.copy()
        stats.update({
            'state': self.state.value,
            'queue_size': self._playback_queue.qsize(),
            'engine_type': type(self.playback_engine).__name__ if self.playback_engine else None,
            'volume': self.config.volume,
            'sample_rate': self.config.sample_rate,
            'channels': self.config.channels
        })
        return stats
    
    def is_playing(self) -> bool:
        """Check if currently playing audio"""
        return self.state in [PlaybackState.PLAYING, PlaybackState.BUFFERING]
    
    def reset_stats(self):
        """Reset playback statistics"""
        self._stats = {
            'chunks_played': 0,
            'total_playback_time': 0.0,
            'buffer_underruns': 0,
            'playback_errors': 0,
            'average_chunk_duration': 0.0
        }


# Factory function
def create_progressive_player(config: PlaybackConfig = None) -> ProgressiveAudioPlayer:
    """
    Create and initialize a progressive audio player.
    
    Args:
        config: Optional playback configuration
    
    Returns:
        ProgressiveAudioPlayer: Initialized progressive player
    """
    player = ProgressiveAudioPlayer(config)
    
    if player.playback_engine:
        console.print_info("✅ Progressive audio player ready")
    else:
        console.print_warning("⚠️ Progressive audio player created but no engine available")
    
    return player


# Export main classes
__all__ = [
    'PlaybackState',
    'PlaybackConfig', 
    'ProgressiveAudioPlayer',
    'create_progressive_player'
]
