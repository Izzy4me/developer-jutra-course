from abc import ABC, abstractmethod

# ============================================================================
# TTS Engine Base Class
# ============================================================================

class TTSEngine(ABC):
    """Abstract base class for TTS engines"""
    
    def __init__(self, name: str):
        self.name = name
        self.is_available = False
    
    @abstractmethod
    def initialize(self) -> bool:
        """Initialize the TTS engine. Returns True if successful."""
        pass
    
    @abstractmethod
    def synthesize(self, text: str, output_path: str, language: str = 'pl', rate: int = 150, role: str = 'assistant', voice_sample: str = None) -> bool:
        """
        Synthesize speech from text.
        
        Args:
            text: Text to convert to speech
            output_path: Path where to save the audio file
            language: Language code (e.g., 'pl', 'en')
            rate: Speech rate (words per minute) - engine may interpret differently
            role: Role of the speaker ('user' or 'assistant')
            voice_sample: Path to custom voice sample WAV file (optional, only for user role)
        
        Returns:
            bool: True if successful
        """
        pass
    
    def cleanup(self):
        """Optional cleanup method"""
        pass
