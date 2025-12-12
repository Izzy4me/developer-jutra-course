import subprocess
import sys
from cli import console
import wave
import os
from .TTSEngine import TTSEngine

# ============================================================================
# PyTTSX3 Engine (Last resort fallback, very poor polish support)
# ============================================================================

class PyTTSX3Engine(TTSEngine):
    """PyTTSX3 engine - basic offline TTS fallback"""
    
    def __init__(self):
        super().__init__("pyttsx3")
    
    def initialize(self) -> bool:
        """Check if pyttsx3 is available"""
        try:
            import pyttsx3
            # Test initialization
            engine = pyttsx3.init()
            engine.stop()
            self.is_available = True
            console.print_info("✅ pyttsx3 dostępny jako zapasowy silnik TTS")
            return True
        except Exception as e:
            console.print_warning(f"⚠️  pyttsx3 niedostępny: {e}")
            self.is_available = False
            return False
    
    def synthesize(self, text: str, output_path: str, language: str = 'pl', rate: int = 150, role: str = 'assistant', voice_sample: str = None) -> bool:
        """Generate speech using pyttsx3"""
        if not self.is_available:
            return False
        
        # Warn if custom voice is requested (not supported)
        if voice_sample:
            console.print_warning("⚠️  Using custom voices are not supported with this engine")
        
        try:
            import pyttsx3
            
            engine = pyttsx3.init()
            engine.setProperty('rate', rate)
            
            # Generate to temp file first
            temp_output = output_path + '.tmp'
            engine.save_to_file(text, temp_output)
            engine.runAndWait()
            
            # Verify file was created
            if not os.path.exists(temp_output) or os.path.getsize(temp_output) == 0:
                if os.path.exists(temp_output):
                    os.remove(temp_output)
                return False
            
            # Check if it's valid WAV, convert if needed (macOS generates AIFF)
            try:
                with wave.open(temp_output, 'rb') as wf:
                    if wf.getnframes() == 0:
                        if os.path.exists(temp_output):
                            os.remove(temp_output)
                        return False
                # Valid WAV, rename
                if os.path.exists(output_path):
                    os.remove(output_path)
                os.rename(temp_output, output_path)
            except wave.Error:
                # Not WAV, try to convert
                converted = self._convert_to_wav(temp_output, output_path)
                if os.path.exists(temp_output):
                    os.remove(temp_output)
                if not converted:
                    return False
            
            return True
            
        except Exception as e:
            console.print_error(f"Błąd pyttsx3: {e}")
            return False

    def _convert_to_wav(self, input_path: str, output_path: str) -> bool:
      """
      Convert audio file to WAV format using ffmpeg or afconvert (macOS). Needed for PyTTSX3
      
      Returns:
          bool: True if conversion successful
      """
      # Try afconvert first (built-in on macOS)
      if sys.platform == 'darwin':
          try:
              subprocess.run([
                  'afconvert',
                  '-f', 'WAVE',  # Output format
                  '-d', 'LEI16@44100',  # 16-bit PCM at 44.1kHz
                  input_path,
                  output_path
              ], check=True, capture_output=True)
              
              # Verify the output
              if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                  return True
          except (subprocess.CalledProcessError, FileNotFoundError) as e:
              console.print_warning(f"afconvert nie powiódł się: {e}")
      
      # Try ffmpeg as fallback
      try:
          subprocess.run([
              'ffmpeg',
              '-i', input_path,
              '-acodec', 'pcm_s16le',
              '-ar', '44100',
              '-ac', '1',
              '-y',  # Overwrite output
              output_path
          ], check=True, capture_output=True, stderr=subprocess.DEVNULL)
          
          if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
              return True
      except (subprocess.CalledProcessError, FileNotFoundError):
          pass
      
      console.print_error("Nie można przekonwertować pliku audio do formatu WAV. Zainstaluj ffmpeg lub sprawdź afconvert.")
      return False
