import subprocess
import asyncio
import threading
from cli import console
import os
from .TTSEngine import TTSEngine
from .pydub_utils import HAVE_PYDUB, AudioSegment
from .async_edgetts import AsyncEdgeTTSProcessor, TTSRequest

# ============================================================================
# Microsoft Edge TTS Engine
# ============================================================================


class EdgeTTSEngine(TTSEngine):
    """Microsoft Edge TTS engine - excellent multilingual support including Polish"""

    def __init__(self):
        super().__init__("Microsoft Edge TTS")
        self.edge_tts = None
        self._async_processor = None
        self._init_lock = threading.Lock()
        self._batch_mode_enabled = True

    def initialize(self) -> bool:
        """Initialize Microsoft Edge TTS"""
        try:
            import edge_tts
            import asyncio

            # Test initialization with async function
            async def test_voices():
                voices = await edge_tts.list_voices()
                return voices
            
            # Check voices with proper async handling
            try:
                loop = asyncio.get_running_loop()
                # Event loop already running - just validate module import
                voices = True
            except RuntimeError:
                # No event loop - safe to use asyncio.run()
                voices = asyncio.run(test_voices())
            
            if voices:
                self.edge_tts = edge_tts
                # Initialize async processor for batch operations
                self._async_processor = AsyncEdgeTTSProcessor(max_concurrent=6)
                self.is_available = True
                console.print_info("✅ Microsoft Edge TTS gotowy (doskonała jakość polskiego i angielskiego + async batch)")
                return True
            else:
                console.print_warning("⚠️  Microsoft Edge TTS: brak dostępnych głosów")
                return False

        except Exception as e:
            console.print_warning(f"⚠️  Nie można załadować Microsoft Edge TTS: {e}")
            self.is_available = False
            return False

    def synthesize(self, text: str, output_path: str, language: str = 'pl', rate: int = 150, role: str = 'assistant') -> bool:
        """Generate speech using Microsoft Edge TTS"""
        if not self.is_available or not self.edge_tts:
            return False

        try:
            # Select voice based on language and role
            if language.lower() in ['pl', 'polish']:
                if role.lower() == 'user':
                    # Polish male voice for user
                    voice = "pl-PL-MarekNeural"  # Polish male voice
                else:
                    # Polish female voice for assistant
                    voice = "pl-PL-ZofiaNeural"  # Excellent Polish female voice
            else:
                if role.lower() == 'user':
                    # English male voice for user
                    voice = "en-US-ChristopherNeural"  # English male voice
                else:
                    # English female voice for assistant
                    voice = "en-US-AriaNeural"  # Excellent English female voice

            # Convert rate to Edge TTS format (+/- percentage)
            # Edge TTS uses +/- percentage from normal speed
            # Normal speech is ~150 WPM, so we map rate to +/- percentage
            if rate < 150:
                # Slower speech
                speed_percentage = max(-50, ((rate - 150) / 150) * 100)
            else:
                # Faster speech
                speed_percentage = min(100, ((rate - 150) / 150) * 100)

            rate_str = f"{speed_percentage:+.0f}%"

            # Generate audio using Edge TTS built-in save method
            # Edge TTS generates MP3 by default, so we'll use .mp3 extension temporarily
            temp_mp3_path = output_path + '.temp.mp3'
            communicate = self.edge_tts.Communicate(text, voice, rate=rate_str)

            # Use the built-in save method with proper async handling
            import asyncio
            try:
                loop = asyncio.get_running_loop()
                # Event loop running - use thread pool
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(
                        asyncio.run,
                        communicate.save(temp_mp3_path)
                    )
                    future.result(timeout=30)
            except RuntimeError:
                # No event loop - safe to use asyncio.run()
                asyncio.run(communicate.save(temp_mp3_path))

            # Verify MP3 was created
            if not os.path.exists(temp_mp3_path) or os.path.getsize(temp_mp3_path) == 0:
                console.print_error("Plik MP3 nie został utworzony")
                return False

            # Convert MP3 to WAV using pydub or ffmpeg
            success = self._convert_mp3_to_wav(temp_mp3_path, output_path)

            # Clean up temp file
            if os.path.exists(temp_mp3_path):
                os.remove(temp_mp3_path)

            if not success:
                return False

            # Final validation
            file_size = os.path.getsize(output_path)
            if file_size == 0:
                console.print_error("Plik WAV jest pusty")
                return False

            console.print_info(f"✅ Wygenerowano plik WAV: {file_size} bajtów")
            return True

        except Exception as e:
            console.print_error(f"Błąd Microsoft Edge TTS: {e}")
            return False

    def _convert_mp3_to_wav(self, mp3_path: str, wav_path: str) -> bool:
        """Convert MP3 file to WAV format"""
        # Try pydub first
        if HAVE_PYDUB:
            try:
                audio = AudioSegment.from_mp3(mp3_path)
                audio.export(wav_path, format="wav")
                return True
            except Exception as e:
                console.print_warning(f"Pydub conversion failed: {e}")

        # Fallback to ffmpeg
        try:
            result = subprocess.run([
                'ffmpeg', '-y',
                '-i', mp3_path,
                '-acodec', 'pcm_s16le',
                '-ar', '44100',
                '-ac', '1',
                wav_path
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            if result.returncode == 0 and os.path.exists(wav_path):
                return True
            else:
                console.print_error(f"ffmpeg conversion failed: {result.stderr}")
                return False

        except Exception as e:
            console.print_error(f"ffmpeg conversion error: {e}")
            return False
    
    def synthesize_batch_optimized(self, texts_and_paths: list, language: str = 'pl') -> list:
        """Optimized batch processing using async EdgeTTS processor"""
        if not self.is_available or not self._async_processor:
            return [False] * len(texts_and_paths)
        
        try:
            # Convert to TTSRequest objects
            requests = []
            for text, output_path, rate, role in texts_and_paths:
                request = TTSRequest(
                    text=text,
                    output_path=output_path,
                    language=language,
                    rate=rate,
                    role=role
                )
                requests.append(request)
            
            # Process requests through async processor with proper async handling
            try:
                loop = asyncio.get_running_loop()
                # Event loop running - use thread pool
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(
                        asyncio.run,
                        self._async_processor.batch_synthesize(requests)
                    )
                    results = future.result(timeout=60)
            except RuntimeError:
                # No event loop - safe to use asyncio.run()
                results = asyncio.run(self._async_processor.batch_synthesize(requests))
            
            # Convert results to boolean list
            return [result.success for result in results]
            
        except Exception as e:
            console.print_error(f"Async batch synthesis failed: {e}")
            return [False] * len(texts_and_paths)
    
    def supports_batch_optimization(self) -> bool:
        """Check if this engine supports optimized batch processing"""
        return self._batch_mode_enabled and self._async_processor is not None
    
    def get_performance_stats(self) -> dict:
        """Get performance statistics from async processor"""
        if self._async_processor:
            return self._async_processor.get_statistics()
        return {}
    
    def reset_performance_stats(self):
        """Reset performance statistics"""
        if self._async_processor:
            self._async_processor.reset_statistics()
