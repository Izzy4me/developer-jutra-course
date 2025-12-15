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
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from files.config import LOG_DIR
from cli import console

from .TTSEngine import TTSEngine
from .XTTSv2Engine import XTTSv2TTSEngine
from .EdgeTTSEngine import EdgeTTSEngine
from .PyTTSX3Engine import PyTTSX3Engine
from .pydub_utils import HAVE_PYDUB, AudioSegment, pydub_play


# ============================================================================
# TTS Manager
# ============================================================================

class TTSManager:
    """Manages multiple TTS engines with automatic fallback"""
    
    def __init__(self, mode: str = 'balanced', voice_sample: Optional[str] = None):
        self.engines: List[TTSEngine] = []
        self.active_engine: Optional[TTSEngine] = None
        self._engine_cache = {}  # Cache engines by class name
        self.mode = mode
        self.voice_sample = voice_sample
        self._initialize_engines()
    
    def _initialize_engines(self):
        """Initialize all available TTS engines in priority order based on mode"""

        # Map modes to preferred engines
        mode_engine_map = {
            'balanced': EdgeTTSEngine,      # Fast, good quality, needs Internet
            'custom-quality': XTTSv2TTSEngine,  # Offline, slower on CPU, custom voice support
            'poor': PyTTSX3Engine           # Offline, fast, robotic voice
        }
        
        # Get preferred engine for mode, default to EdgeTTS
        preferred_engine = mode_engine_map.get(self.mode, EdgeTTSEngine)
        
        # Priority order: preferred engine first, then fallbacks
        engine_classes = [
            preferred_engine,
            EdgeTTSEngine,
            XTTSv2TTSEngine,
            PyTTSX3Engine
        ]
        
        # Performance trick - remove duplicates while preserving order
        seen = set()
        engine_classes = [e for e in engine_classes if not (e in seen or seen.add(e))]
        
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
            if self.active_engine.synthesize(text, output_path, language, rate, role, self.voice_sample):
                return True
            else:
                console.print_warning(f"Silnik {self.active_engine.name} zawiódł, próbuję zapasowy...")
        
        # Fallback to other engines
        for engine in self.engines:
            if engine != self.active_engine and engine.is_available:
                console.print_info(f"Próbuję zapasowy silnik: {engine.name}")
                if engine.synthesize(text, output_path, language, rate, role, self.voice_sample):
                    return True
        
        return False
    
    def get_active_engine_name(self) -> str:
        """Get name of currently active engine"""
        return self.active_engine.name if self.active_engine else "Brak"
    
    def synthesize_batch(self, texts_and_paths: List[tuple], language: str = 'pl', max_workers: int = None) -> List[bool]:
        """Synthesize multiple texts in parallel for faster processing"""
        if not self.engines or not self.active_engine:
            return [False] * len(texts_and_paths)
        
        # Adjust max_workers based on active engine
        if max_workers is None:
            if self.active_engine.name == "XTTS-v2":
                max_workers = 1  # XTTS-v2 is not thread-safe, use sequential processing
            else:
                max_workers = 3  # Other engines can handle more parallel processing
        
        def synthesize_single(item):
            text, output_path, rate, role = item
            return self.synthesize(text, output_path, language, rate, role)
        
        # Use ThreadPoolExecutor for parallel processing
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_index = {executor.submit(synthesize_single, item): i for i, item in enumerate(texts_and_paths)}
            results = [False] * len(texts_and_paths)
            
            # Collect results in order
            for future in as_completed(future_to_index):
                index = future_to_index[future]
                try:
                    result = future.result(timeout=60)  # Increased timeout to 60 seconds
                    results[index] = result
                except Exception as e:
                    console.print_warning(f"Błąd podczas syntezy wiadomości {index+1}: {e}")
                    results[index] = False
            
            return results


# Initialize global TTS manager
_tts_manager_cache: Dict[str, TTSManager] = {}

def get_tts_manager(mode: str = 'balanced', voice_sample: Optional[str] = None) -> TTSManager:
    """Get or create TTS manager instance for specific mode and voice sample"""
    global _tts_manager_cache
    # Create cache key combining mode and voice_sample
    cache_key = f"{mode}:{voice_sample or 'default'}"
    if cache_key not in _tts_manager_cache:
        _tts_manager_cache[cache_key] = TTSManager(mode=mode, voice_sample=voice_sample)
    return _tts_manager_cache[cache_key]


def _get_message_text(message: Dict) -> str:
    """Extract text from a message dict (universal format)."""
    if 'parts' in message and message['parts']:
        return message['parts'][0].get('text', '')
    return message.get('text', '')


def _get_message_role(message: Dict) -> str:
    """Extract role from a message dict."""
    return message.get('role', 'unknown')

# Command for command handler
def generate_audio_for_last(session_id: str, history: List[Dict], play: bool = True, language: str = 'pl', mode: str = 'balanced', voice_sample: Optional[str] = None) -> Optional[str]:
    """
    Generate audio file for the last assistant response.
    
    Args:
        session_id: Session identifier
        history: Conversation history
        play: Whether to play the audio after generation
        language: Language code ('pl' for Polish, 'en' for English)
        mode: TTS mode - 'balanced' (EdgeTTS), 'custom-quality' (XTTS-v2), or 'poor' (pyttsx3)
        voice_sample: Path to custom voice sample WAV file (only for user role)
    
    Returns:
        str: Path to generated WAV file, or None if failed
    """
    tts_manager = get_tts_manager(mode, voice_sample)
    
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
    language: str = 'pl',
    mode: str = 'balanced',
    voice_sample: Optional[str] = None
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
        mode: TTS mode - 'balanced' (EdgeTTS), 'custom-quality' (XTTS-v2), or 'poor' (pyttsx3)
        voice_sample: Path to custom voice sample WAV file (only for user role)
    
    Returns:
        str: Path to generated WAV file, or None if failed
    """
    tts_manager = get_tts_manager(mode, voice_sample)
    
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
        
        console.print_info(f"🚀 Przetwarzam {len(batch_data)} wiadomości równolegle...")
        
        # Process all messages in parallel
        results = tts_manager.synthesize_batch(batch_data, language=language)
        
        # Collect successful files
        for i, (success, (_, temp_path, _, _)) in enumerate(zip(results, batch_data)):
            if success and os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
                temp_files.append(temp_path)
            else:
                console.print_warning(f"Nie udało się wygenerować audio dla wiadomości {i+1}")
        
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
