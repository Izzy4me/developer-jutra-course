import os
import threading
from cli import console
from .TTSEngine import TTSEngine

# ============================================================================
# TTS Engine (XTTS-v2)
# ============================================================================

class XTTSv2TTSEngine(TTSEngine):
    """XTTS-v2 TTS engine - excellent multilingual support including Polish"""
    
    def __init__(self):
        super().__init__("XTTS-v2")
        self.tts = None
        self._model_loaded = False
        self._synthesis_lock = threading.Lock()  # Prevent concurrent synthesis calls
    
    def initialize(self) -> bool:
        """Initialize TTS with XTTS-v2 model"""
        try:
            from TTS.api import TTS
            import torch
            
            # Fix for PyTorch 2.6+ security restrictions
            # Allow TTS config classes to be loaded safely
            try:
                from TTS.tts.configs.xtts_config import XttsConfig
                from TTS.tts.configs.vits_config import VitsConfig
                from TTS.tts.configs.shared_configs import BaseDatasetConfig
                torch.serialization.add_safe_globals([XttsConfig, VitsConfig, BaseDatasetConfig])
            except Exception as e:
                console.print_warning(f"⚠️  Nie można dodać safe globals (PyTorch < 2.6?): {e}")
            
            # Only load model if not already loaded (for performance)
            if not self._model_loaded:
                console.print_info("🎙️  Ładuję model XTTS-v2 TTS (może potrwać przy pierwszym uruchomieniu)...")
                
                # Load XTTS-v2 multilingual model
                self.tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cpu")
                self._model_loaded = True
            
            self.is_available = True
            console.print_info("✅ XTTS-v2 TTS gotowy (obsługuje polski i angielski)")
            return True
            
        except Exception as e:
            console.print_warning(f"⚠️  Nie można załadować XTTS-v2 TTS: {e}")
            self.is_available = False
            return False
    
    def synthesize(self, text: str, output_path: str, language: str = 'pl', rate: int = 150, role: str = 'assistant') -> bool:
        """Generate speech using XTTS-v2 (thread-safe)"""
        if not self.is_available or not self.tts:
            return False
        
        # Use lock to prevent concurrent XTTS calls (not thread-safe)
        with self._synthesis_lock:
            try:
                # Clean and validate text input
                text = text.strip()
                if not text:
                    console.print_warning("Pusty tekst, pomijam")
                    return False
                
                # Limit text length to prevent tensor size issues
                if len(text) > 500:
                    text = text[:500] + "..."
                    console.print_warning("Tekst skrócony do 500 znaków")
                
                # Map language codes
                lang_map = {
                    'pl': 'pl',
                    'polish': 'pl',
                    'en': 'en',
                    'english': 'en'
                }
                lang_code = lang_map.get(language.lower(), 'en')
                
                # Calculate speed from rate (XTTS uses speed multiplier, not WPM)
                # Normal speech is ~150 WPM, so rate/150 gives us speed multiplier
                speed = max(0.5, min(2.0, rate / 150.0))
                
                # XTTS-v2 is multi-speaker and requires speaker parameter
                # Use default speakers: "Claribel Dervla" (female) or "Damien Black" (male)
                speaker = "Claribel Dervla" if role.lower() != 'user' else "Damien Black"
                
                # Generate audio (XTTS outputs WAV directly)
                self.tts.tts_to_file(
                    text=text,
                    file_path=output_path,
                    speaker=speaker,
                    language=lang_code,
                    speed=speed
                )
                
                # Verify output
                if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                    console.print_error("XTTS nie wygenerował prawidłowego pliku")
                    return False
                
                return True
                
            except Exception as e:
                console.print_error(f"Błąd XTTS-v2 TTS: {e}")
                # Clean up failed output file
                if os.path.exists(output_path):
                    try:
                        os.remove(output_path)
                    except:
                        pass
                return False
