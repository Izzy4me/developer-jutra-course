"""
Audio generation commands for chat sessions.
Converts session messages to speech using TTS and saves as WAV files.
Supports multiple TTS engines: XTTS-v2, EdgeTTS, pyttsx3
"""
import os
import tempfile
import subprocess
import sys
import wave
import shutil
import time
from typing import List, Dict, Optional
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, as_completed
from files.config import LOG_DIR
from cli import console

from .TTSEngine import TTSEngine
from .XTTSv2Engine import XTTSv2TTSEngine
from .config import ConfigManager
from .text_processor import TextChunker
from .streaming_infrastructure import StreamingAudioManager, StreamingConfig
from .edgetts_streaming import EdgeTTSStreamingEngine
from .EdgeTTSEngine import EdgeTTSEngine
from .PyTTSX3Engine import PyTTSX3Engine
from .pydub_utils import HAVE_PYDUB, AudioSegment, pydub_play
from .text_processor import TextChunker, TextChunk
from .config import get_tts_config, get_config_manager


# ============================================================================
# TTS Manager
# ============================================================================

class TTSManager:
    """Manages multiple TTS engines with automatic fallback and optimization"""
    
    def __init__(self):
        self.engines: List[TTSEngine] = []
        self.active_engine: Optional[TTSEngine] = None
        self._engine_cache = {}  # Cache engines by class name
        
        # Initialize optimization components
        self.config = get_tts_config()
        self.config_manager = ConfigManager()
        self.text_chunker = TextChunker()
        
        # Streaming infrastructure
        self.streaming_config = StreamingConfig(
            chunk_size_ms=500,
            buffer_size=10,
            progressive_playback=True,
            auto_play=False  # Manual control for now
        )
        self.streaming_manager = None
        
        self._initialize_engines()
    
    def _initialize_engines(self):
        """Initialize all available TTS engines in priority order"""

        # Priority order having fallback to other engines
        # ! IMPORTANT!
        engine_classes = [
            XTTSv2TTSEngine, # SLOW, GOOD but 100% offline
            EdgeTTSEngine, # FAST, GOOD but needs Internet
            PyTTSX3Engine, # please don't
        ]
        
        for engine_class in engine_classes:
            class_name = engine_class.__name__
            
            # Check cache first
            if class_name in self._engine_cache:
                engine = self._engine_cache[class_name]
                if engine.is_available:
                    self.engines.append(engine)
                    self.active_engine = engine
                    console.print_info(f"🎯 Używam silnika TTS (z cache): {engine.name}")
                    break
            
            try:
                engine = engine_class()
                if engine.initialize():
                    self._engine_cache[class_name] = engine  # Cache successful engine
                    self.engines.append(engine)
                    self.active_engine = engine
                    console.print_info(f"🎯 Używam silnika TTS: {engine.name}")
                    break  # Stop initializing other engines once one is ready
            except Exception as e:
                console.print_warning(f"Nie udało się zainicjować {engine_class.__name__}: {e}")
        
        if not self.engines:
            console.print_error("⚠️  Brak dostępnych silników TTS!")
    
    def synthesize(self, text: str, output_path: str, language: str = 'pl', rate: int = 150, role: str = 'assistant') -> bool:
        """
        Synthesize speech using available engines with fallback.
        
        Tries active engine first, then falls back to other engines.
        """
        if not self.engines:
            console.print_error("Brak dostępnych silników TTS")
            return False
        
        # Try active engine first
        if self.active_engine and self.active_engine.is_available:
            if self.active_engine.synthesize(text, output_path, language, rate, role):
                return True
            else:
                console.print_warning(f"Silnik {self.active_engine.name} zawiódł, próbuję zapasowy...")
        
        # Fallback to other engines
        for engine in self.engines:
            if engine != self.active_engine and engine.is_available:
                console.print_info(f"Próbuję zapasowy silnik: {engine.name}")
                if engine.synthesize(text, output_path, language, rate, role):
                    return True
        
        return False
    
    def get_active_engine_name(self) -> str:
        """Get the name of currently active TTS engine"""
        return self.active_engine.name if self.active_engine else "Brak"
    
    def synthesize_batch_texts(self, texts: List[str], language: str = 'pl', max_workers: int = None) -> List[bool]:
        """Synthesize multiple texts with automatic file path generation"""
        import os
        from datetime import datetime
        
        # Create tuples with auto-generated paths and default parameters
        texts_and_paths = []
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        for i, text in enumerate(texts):
            filename = f"test_audio_{timestamp}_{i+1:03d}.mp3"
            output_path = os.path.join("temp_audio", filename)
            # Ensure temp directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            texts_and_paths.append((text, output_path, 150, 'default'))
        
        return self.synthesize_batch(texts_and_paths, language, max_workers)
    
    def synthesize_batch(self, texts_and_paths: List[tuple], language: str = 'pl', max_workers: int = None) -> List[bool]:
        """Synthesize multiple texts in parallel with optimization"""
        if not self.engines or not self.active_engine:
            return [False] * len(texts_and_paths)
        
        # Get max workers from configuration
        if max_workers is None:
            max_workers = self.config_manager.get_engine_max_workers(self.active_engine.name)
        
        # Preprocess texts if smart preprocessing is enabled
        processed_items = []
        if self.config_manager.is_feature_enabled("smart_text_preprocessing"):
            for text, output_path, rate, role in texts_and_paths:
                optimized_text = self.text_chunker.optimize_text_for_tts(text)
                processed_items.append((optimized_text, output_path, rate, role))
        else:
            processed_items = texts_and_paths
        
        # Check for engine-specific batch optimization
        if (hasattr(self.active_engine, 'synthesize_batch_optimized') and
            hasattr(self.active_engine, 'supports_batch_optimization') and
            self.active_engine.supports_batch_optimization()):
            console.print_info(f"🚀 Używam zoptymalizowanej syntezy batch dla {self.active_engine.name}")
            
            try:
                results = self.active_engine.synthesize_batch_optimized(processed_items, language)
                
                # Log performance metrics for optimized batch
                if self.config.enable_performance_monitoring and start_time:
                    duration = time.time() - start_time
                    success_count = sum(results) if isinstance(results, list) else 0
                    console.print_info(f"📊 Optimized batch: {success_count}/{len(results)} success, {duration:.2f}s")
                    
                    # Get engine-specific stats if available
                    if hasattr(self.active_engine, 'get_performance_stats'):
                        stats = self.active_engine.get_performance_stats()
                        if stats:
                            console.print_info(f"🔧 Engine stats: {stats}")
                
                return results
            except Exception as e:
                console.print_warning(f"Optimized batch failed, falling back to standard: {e}")
        
        def synthesize_single(item):
            text, output_path, rate, role = item
            
            # Use chunked synthesis for long texts if enabled
            if (self.config_manager.is_feature_enabled("parallel_chunking") and 
                len(text) > self.config.chunk_size):
                return self._synthesize_with_chunking(text, output_path, language, rate, role)
            else:
                return self.synthesize(text, output_path, language, rate, role)
        
        # Performance monitoring
        start_time = None
        if self.config.enable_performance_monitoring:
            import time
            start_time = time.time()
        
        # Use ThreadPoolExecutor for parallel processing
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_index = {executor.submit(synthesize_single, item): i for i, item in enumerate(processed_items)}
            results = [False] * len(processed_items)
            
            # Collect results in order
            for future in as_completed(future_to_index):
                index = future_to_index[future]
                try:
                    result = future.result(timeout=self.config.synthesis_timeout_seconds)
                    results[index] = result
                except Exception as e:
                    console.print_warning(f"Błąd podczas syntezy wiadomości {index+1}: {e}")
                    results[index] = False
            
            # Log performance metrics
            if self.config.enable_performance_monitoring and start_time:
                duration = time.time() - start_time
                success_count = sum(results)
                console.print_info(f"📊 Batch synthesis: {success_count}/{len(results)} success, {duration:.2f}s total")
            
            return results
    
    def _synthesize_with_chunking(self, text: str, output_path: str, language: str, rate: int, role: str) -> bool:
        """Synthesize long text using chunking for better performance"""
        try:
            chunks = self.text_chunker.chunk_text(text, preserve_sentences=True)
            
            if len(chunks) <= 1:
                # Text is short enough, use regular synthesis
                return self.synthesize(text, output_path, language, rate, role)
            
            if not HAVE_PYDUB:
                console.print_warning("Pydub not available for chunked synthesis, falling back to regular synthesis")
                return self.synthesize(text, output_path, language, rate, role)
            
            # Synthesize chunks and combine
            combined_audio = AudioSegment.empty()
            temp_files = []
            
            try:
                for i, chunk in enumerate(chunks):
                    temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
                    temp_path = temp_file.name
                    temp_file.close()
                    temp_files.append(temp_path)
                    
                    success = self.synthesize(chunk.text, temp_path, language, rate, role)
                    if success and os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
                        chunk_audio = AudioSegment.from_wav(temp_path)
                        combined_audio += chunk_audio
                        
                        # Add small pause between chunks
                        if i < len(chunks) - 1:
                            combined_audio += AudioSegment.silent(duration=200)
                    else:
                        console.print_warning(f"Failed to synthesize chunk {i+1}/{len(chunks)}")
                
                # Export combined audio
                if len(combined_audio) > 0:
                    combined_audio.export(output_path, format="wav")
                    return True
                else:
                    return False
                    
            finally:
                # Cleanup temp files
                if self.config.cleanup_temp_files:
                    for temp_path in temp_files:
                        if os.path.exists(temp_path):
                            try:
                                os.unlink(temp_path)
                            except:
                                pass
            
        except Exception as e:
            console.print_error(f"Błąd podczas syntezy z chunkowaniem: {e}")
            # Fallback to regular synthesis
            return self.synthesize(text, output_path, language, rate, role)
    
    def initialize_streaming(self) -> bool:
        """
        Initialize streaming capabilities for the current TTS engine.
        
        Returns:
            bool: True if streaming was successfully initialized
        """
        if not self.active_engine:
            console.print_error("❌ No active TTS engine for streaming")
            return False
        
        try:
            # Check if current engine supports streaming
            if hasattr(self.active_engine, 'supports_streaming') and self.active_engine.supports_streaming():
                # Use existing streaming engine
                streaming_engine = self.active_engine
            else:
                # For EdgeTTS, extend the existing engine with streaming capabilities
                if self.active_engine.name == "Microsoft Edge TTS":
                    # Extend current EdgeTTS engine with streaming methods
                    from .streaming_infrastructure import StreamingTTSEngine
                    
                    # Create a streaming adapter that uses the existing engine
                    class EdgeTTSStreamingAdapter(StreamingTTSEngine):
                        def __init__(self, base_engine):
                            self.base_engine = base_engine
                        
                        def supports_streaming(self) -> bool:
                            return self.base_engine.is_available
                        
                        def get_optimal_chunk_size(self) -> int:
                            return 500  # 500ms chunks
                        
                        async def synthesize_streaming(self, text: str, **kwargs):
                            # Simple streaming by chunking text and using base engine
                            from .text_processor import TextChunker
                            from .streaming_infrastructure import AudioChunk
                            import tempfile
                            import os
                            import time
                            
                            chunker = TextChunker()
                            text_chunks = chunker.chunk_for_streaming(text, target_duration_ms=500)
                            
                            for chunk_id, text_chunk in enumerate(text_chunks):
                                try:
                                    # Generate audio for this chunk using base engine
                                    temp_output = f'/tmp/stream_chunk_{chunk_id}_{int(time.time())}.wav'
                                    
                                    # Use async synthesis to avoid event loop conflicts
                                    import asyncio
                                    import concurrent.futures
                                    
                                    # Run synthesis in thread pool to avoid asyncio conflicts
                                    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                                        future = executor.submit(
                                            self.base_engine.synthesize,
                                            text_chunk,
                                            temp_output,
                                            kwargs.get('language', 'pl'),
                                            kwargs.get('rate', 150),
                                            kwargs.get('role', 'default')
                                        )
                                        success = await asyncio.wrap_future(future)
                                    
                                    if success and os.path.exists(temp_output):
                                        # Read audio data
                                        with open(temp_output, 'rb') as f:
                                            audio_data = f.read()
                                        
                                        # Estimate duration (rough calculation)
                                        duration_ms = (len(audio_data) / 44100 / 2) * 1000
                                        
                                        # Create audio chunk
                                        chunk = AudioChunk(
                                            chunk_id=chunk_id,
                                            audio_data=audio_data,
                                            duration_ms=duration_ms,
                                            text_segment=text_chunk,
                                            chunk_size=len(audio_data)
                                        )
                                        
                                        # Cleanup temp file
                                        try:
                                            os.unlink(temp_output)
                                        except:
                                            pass
                                        
                                        yield chunk
                                    
                                except Exception as e:
                                    console.print_warning(f'⚠️ Failed to generate chunk {chunk_id}: {e}')
                                    continue
                    
                    streaming_engine = EdgeTTSStreamingAdapter(self.active_engine)
                elif self.active_engine.name == "XTTS-v2":
                    # Create XTTS streaming adapter
                    from .xtts_streaming_adapter import create_xtts_streaming_adapter
                    streaming_engine = create_xtts_streaming_adapter(self.active_engine)
                else:
                    console.print_warning(f"⚠️ Streaming not supported for {self.active_engine.name}")
                    return False
            
            # Initialize streaming manager
            self.streaming_manager = StreamingAudioManager(
                tts_engine=streaming_engine,
                config=self.streaming_config
            )
            
            console.print_info("✅ Streaming capabilities initialized")
            return True
            
        except Exception as e:
            console.print_error(f"❌ Failed to initialize streaming: {e}")
            return False
    
    async def synthesize_streaming(
        self, 
        text: str, 
        language: str = 'pl', 
        rate: int = 150,
        role: str = 'default',
        enable_progressive_playback: bool = False
    ):
        """
        Synthesize text using streaming TTS with progressive chunk delivery.
        
        Args:
            text: Text to synthesize
            language: Target language
            rate: Speech rate in WPM
            role: Voice role
            enable_progressive_playback: Whether to enable real-time playback
        
        Yields:
            AudioChunk: Progressive audio chunks as they're generated
        """
        if not self.streaming_manager:
            if not self.initialize_streaming():
                console.print_error("❌ Could not initialize streaming for synthesis")
                return
        
        try:
            console.print_info(f"🎵 Starting streaming synthesis: '{text[:50]}...'")
            
            # Delegate to streaming manager and yield chunks
            async for chunk in self.streaming_manager.start_streaming_synthesis(
                text=text,
                language=language,
                rate=rate,
                role=role
            ):
                console.print_info(
                    f"📦 Yielding chunk {chunk.chunk_id}: "
                    f"{chunk.duration_ms:.1f}ms, {chunk.chunk_size} bytes"
                )
                yield chunk
            
            console.print_info("✅ Streaming synthesis completed")
            
        except Exception as e:
            console.print_error(f"❌ Streaming synthesis failed: {e}")
            import traceback
            console.print_error(f"🐛 Traceback: {traceback.format_exc()}")
            return
    
    def get_streaming_status(self) -> dict:
        """
        Get current streaming status and capabilities.
        
        Returns:
            dict: Streaming status information
        """
        if not self.streaming_manager:
            return {
                'streaming_initialized': False,
                'engine_supports_streaming': False,
                'streaming_available': False
            }
        
        status = self.streaming_manager.get_streaming_status()
        status.update({
            'streaming_initialized': True,
            'streaming_available': True,
            'active_engine': self.active_engine.name if self.active_engine else None
        })
        
        return status
    
    def supports_streaming(self) -> bool:
        """
        Check if current configuration supports streaming synthesis.
        
        Returns:
            bool: True if streaming is supported
        """
        if not self.active_engine:
            return False
        
        # Check if engine has native streaming support
        if hasattr(self.active_engine, 'supports_streaming'):
            return self.active_engine.supports_streaming()
        
        # Check if we can create streaming wrapper
        return self.active_engine.name in ["Microsoft Edge TTS", "XTTS-v2"]
    
    # =================== Progressive Playback Integration (Phase 4) ===================
    
    def enable_progressive_playback(self, playback_config=None) -> bool:
        """
        Enable progressive playback for streaming TTS.
        
        Args:
            playback_config: Optional PlaybackConfig for audio settings
            
        Returns:
            bool: True if progressive playback enabled successfully
        """
        if not self.streaming_manager:
            if not self.initialize_streaming():
                console.print_error("❌ Cannot enable progressive playback - streaming not available")
                return False
        
        return self.streaming_manager.enable_progressive_playback(playback_config)
    
    async def synthesize_with_playback(
        self,
        text: str,
        language: str = 'pl',
        rate: int = 150,
        role: str = 'assistant',
        playback_config=None
    ) -> bool:
        """
        Synthesize speech with real-time progressive playback.
        
        Args:
            text: Text to synthesize
            language: Target language
            rate: Speech rate (WPM)
            role: Voice role/character
            playback_config: Optional PlaybackConfig for audio settings
            
        Returns:
            bool: True if synthesis with playback completed successfully
        """
        if not self.streaming_manager:
            if not self.initialize_streaming():
                console.print_error("❌ Cannot synthesize with playback - streaming not available")
                return False
        
        return await self.streaming_manager.start_streaming_with_playback(
            text=text,
            language=language,
            rate=rate,
            role=role,
            playback_config=playback_config
        )
    
    def stop_progressive_playback(self):
        """Stop progressive playback"""
        if self.streaming_manager:
            self.streaming_manager.stop_progressive_playback()
    
    def pause_progressive_playback(self):
        """Pause progressive playback"""
        if self.streaming_manager:
            self.streaming_manager.pause_progressive_playback()
    
    def resume_progressive_playback(self):
        """Resume progressive playback"""
        if self.streaming_manager:
            self.streaming_manager.resume_progressive_playback()
    
    def set_playback_volume(self, volume: float):
        """Set progressive playback volume (0.0 to 1.0)"""
        if self.streaming_manager:
            self.streaming_manager.set_playback_volume(volume)
    
    def get_progressive_playback_status(self) -> dict:
        """Get progressive playback status and statistics"""
        if not self.streaming_manager:
            return {'available': False, 'message': 'Streaming not initialized'}
        
        return self.streaming_manager.get_progressive_playback_status()


# Initialize global TTS manager
_tts_manager: Optional[TTSManager] = None

def get_tts_manager() -> TTSManager:
    """Get or create global TTS manager instance"""
    global _tts_manager
    if _tts_manager is None:
        _tts_manager = TTSManager()
    return _tts_manager


def _get_message_text(message: Dict) -> str:
    """Extract text from a message dict (universal format)."""
    if 'parts' in message and message['parts']:
        return message['parts'][0].get('text', '')
    return message.get('text', '')


def _get_message_role(message: Dict) -> str:
    """Extract role from a message dict."""
    return message.get('role', 'unknown')

# Command for command handler
def generate_audio_for_last(session_id: str, history: List[Dict], pause_ms: int = 500, play: bool = True, language: str = 'pl') -> Optional[str]:
    """
    Generate audio file for the last assistant response.
    
    Args:
        session_id: Session identifier
        history: Conversation history
        pause_ms: Pause duration (not used for single message, kept for API consistency)
        play: Whether to play the audio after generation
        language: Language code ('pl' for Polish, 'en' for English)
    
    Returns:
        str: Path to generated WAV file, or None if failed
    """
    tts_manager = get_tts_manager()
    
    if not tts_manager.engines:
        console.print_error("Brak dostępnych silników TTS.")
        return None
    
    # Find last assistant message
    last_assistant_msg = None
    for msg in reversed(history):
        if _get_message_role(msg) in ['model', 'assistant']:
            last_assistant_msg = msg
            break
    
    if not last_assistant_msg:
        console.print_error("Brak wiadomości asystenta w historii.")
        return None
    
    text = _get_message_text(last_assistant_msg)
    if not text:
        console.print_error("Ostatnia wiadomość asystenta jest pusta.")
        return None
    
    # Generate output filename: {session_id}-last.wav
    output_path = os.path.join(LOG_DIR, f"{session_id}-last.wav")
    
    console.print_info(f"Generuję audio dla ostatniej odpowiedzi (język: {language})...")
    
    success = tts_manager.synthesize(text, output_path, language=language, rate=150, role='assistant')
    
    if not success:
        console.print_error("Nie udało się wygenerować audio")
        return None
    
    console.print_info(f"✅ Zapisano: {output_path}")
    
    if play:
        _play_audio(output_path)
    
    return output_path

# Command for command handler
def generate_audio_for_all(
    session_id: str,
    history: List[Dict],
    pause_ms: int = 500,
    play: bool = True,
    user_rate: int = 120,
    assistant_rate: int = 130,
    language: str = 'pl'
) -> Optional[str]:
    """
    Generate audio file for entire conversation with different voices for user and assistant.
    
    Args:
        session_id: Session identifier
        history: Conversation history
        pause_ms: Pause duration between messages in milliseconds
        play: Whether to play the audio after generation
        user_rate: Speech rate for user messages (lower = slower, different voice)
        assistant_rate: Speech rate for assistant messages
        language: Language code ('pl' for Polish, 'en' for English)
    
    Returns:
        str: Path to generated WAV file, or None if failed
    """
    tts_manager = get_tts_manager()
    
    if not tts_manager.engines:
        console.print_error("Brak dostępnych silników TTS.")
        return None
    
    if not history:
        console.print_error("Historia sesji jest pusta.")
        return None
    
    console.print_info(f"Generuję audio dla całej konwersacji ({len(history)} wiadomości, język: {language})...")
    
    # Create temporary directory for individual message audio files
    temp_dir = tempfile.mkdtemp()
    temp_files: List[str] = []
    
    try:
        # Prepare batch data for parallel processing
        batch_data = []
        for i, msg in enumerate(history):
            role = _get_message_role(msg)
            text = _get_message_text(msg)
            
            if not text:
                continue
            
            # Determine speech rate based on role
            rate = user_rate if role == 'user' else assistant_rate
            temp_audio_path = os.path.join(temp_dir, f"msg_{i}.wav")
            
            batch_data.append((text, temp_audio_path, rate, role))
        
        if not batch_data:
            console.print_error("Brak wiadomości do przetworzenia.")
            return None
        
        console.print_info(f"🚀 Przetwarzam {len(batch_data)} wiadomości z optymalizacją...")
        
        # Check if streaming synthesis is enabled and supported
        config = get_tts_config()
        if (config.enable_streaming and 
            get_config_manager().is_feature_enabled("streaming_synthesis") and 
            HAVE_PYDUB):
            console.print_info("📡 Używam syntezy strumieniowej...")
            # Streaming not yet implemented, fall back to batch processing
            console.print_info("📡 Synteza strumieniowa w przygotowaniu, używam batch processing...")
        
        # Process all messages in parallel (traditional approach)
        results = tts_manager.synthesize_batch(batch_data, language=language)
        
        # Collect successful files
        success_count = 0
        for i, (success, (_, temp_path, _, _)) in enumerate(zip(results, batch_data)):
            if success and os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
                temp_files.append(temp_path)
                success_count += 1
            else:
                console.print_warning(f"Nie udało się wygenerować audio dla wiadomości {i+1}")
        
        if success_count > 0:
            console.print_info(f"✅ Pomyślnie przetworzono {success_count}/{len(batch_data)} wiadomości")
        
        if not temp_files:
            console.print_error("Nie udało się wygenerować żadnego segmentu audio.")
            return None
        
        # Generate output filename: {session_id}.wav
        output_path = os.path.join(LOG_DIR, f"{session_id}.wav")
        
        # Combine all segments
        console.print_info("Łączę segmenty audio...")
        
        if HAVE_PYDUB:
            # Use pydub for concatenation
            try:
                pause_segment = AudioSegment.silent(duration=pause_ms)
                audio_segments = []
                for idx, fpath in enumerate(temp_files):
                    segment = AudioSegment.from_wav(fpath)
                    audio_segments.append(segment)
                    if idx < len(temp_files) - 1:
                        audio_segments.append(pause_segment)
                combined = sum(audio_segments)
                combined.export(output_path, format="wav")
            except Exception as e:
                console.print_error(f"Błąd podczas łączenia audio (pydub): {e}")
                return None
        else:
            # Fallback: use wave module
            try:
                _concatenate_wav_files(temp_files, output_path, pause_ms)
            except Exception as e:
                console.print_error(f"Błąd podczas łączenia audio (wave fallback): {e}")
                return None
        
        console.print_info(f"✅ Zapisano: {output_path}")
        
        if play:
            _play_audio(output_path)
        
        return output_path
        
    except Exception as e:
        console.print_error(f"Błąd podczas generowania audio: {e}")
        return None
    
    finally:
        # Cleanup temp files
        import shutil
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass


def _play_audio(file_path: str):
    """
    Play audio file using platform-appropriate method.
    
    Args:
        file_path: Path to the WAV file to play
    """
    console.print_info("▶️  Odtwarzam audio...")
    
    try:
        # Try pydub playback first if available
        if HAVE_PYDUB:
            audio = AudioSegment.from_wav(file_path)
            pydub_play(audio)
            return
        else:
            raise RuntimeError("pydub not available")
    except Exception as e:
        # Fallback to platform-specific command
        console.print_warning(f"Pydub playback unavailable: {e}")
        try:
            if sys.platform == 'darwin':  # macOS
                subprocess.run(['afplay', file_path], check=True)
            elif sys.platform == 'linux':
                subprocess.run(['aplay', file_path], check=True)
            elif sys.platform == 'win32':
                import winsound
                winsound.PlaySound(file_path, winsound.SND_FILENAME)
            else:
                console.print_warning(f"Automatyczne odtwarzanie nie jest obsługiwane na platformie: {sys.platform}")
                console.print_info(f"Otwórz plik ręcznie: {file_path}")
        except Exception as platform_error:
            console.print_error(f"Nie można odtworzyć pliku: {platform_error}")
            console.print_info(f"Plik został zapisany. Otwórz go ręcznie: {file_path}")


def _concatenate_wav_files(input_files: List[str], output_path: str, pause_ms: int = 500):
    """
    Concatenate WAV files using wave module.
    Fallback when pydub is unavailable. Requires all files have same audio parameters.
    """
    if not input_files:
        raise ValueError("No input files to concatenate")
    
    # Validate all input files exist and are valid WAV files
    valid_files = []
    for fpath in input_files:
        if not os.path.exists(fpath):
            console.print_warning(f"Plik nie istnieje, pomijam: {fpath}")
            continue
        
        if os.path.getsize(fpath) == 0:
            console.print_warning(f"Plik jest pusty, pomijam: {fpath}")
            continue
        
        try:
            with wave.open(fpath, 'rb') as test_wf:
                if test_wf.getnframes() == 0:
                    console.print_warning(f"Plik WAV nie zawiera danych, pomijam: {fpath}")
                    continue
            valid_files.append(fpath)
        except wave.Error as e:
            console.print_warning(f"Nieprawidłowy plik WAV ({e}), pomijam: {fpath}")
            continue
        except Exception as e:
            console.print_warning(f"Nie można otworzyć pliku ({e}), pomijam: {fpath}")
            continue
    
    if not valid_files:
        raise ValueError("Brak prawidłowych plików WAV do połączenia")
    
    # Read first file parameters
    with wave.open(valid_files[0], 'rb') as first_wf:
        params = first_wf.getparams()
        nchannels = params.nchannels
        sampwidth = params.sampwidth
        framerate = params.framerate
    
    # Calculate silence frames for pause
    pause_frames = int(framerate * pause_ms / 1000)
    silence_bytes = b'\x00' * (pause_frames * nchannels * sampwidth)
    
    # Write concatenated output
    with wave.open(output_path, 'wb') as out_wf:
        out_wf.setparams(params)
        
        for idx, fpath in enumerate(valid_files):
            with wave.open(fpath, 'rb') as in_wf:
                # Verify parameters match
                if (in_wf.getnchannels() != nchannels or 
                    in_wf.getsampwidth() != sampwidth or 
                    in_wf.getframerate() != framerate):
                    console.print_warning(f"Parametry WAV nie pasują, pomijam: {fpath}")
                    continue
                
                # Copy frames
                out_wf.writeframes(in_wf.readframes(in_wf.getnframes()))
            
            # Add pause between files (except after last)
            if idx < len(valid_files) - 1:
                out_wf.writeframes(silence_bytes)
