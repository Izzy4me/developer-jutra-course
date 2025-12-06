"""
Unit tests for text processing optimization components.
Tests text chunking, sentence splitting, and TTS text optimization.
"""

import unittest
import sys
import os

# Add the src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from commands.audio.text_processor import TextChunker, TextChunk
from commands.audio.config import TTSConfig, ConfigManager


class TestTextChunker(unittest.TestCase):
    """Test cases for TextChunker class"""
    
    def setUp(self):
        self.chunker = TextChunker(max_chunk_size=100, overlap=20, min_chunk_size=10)
    
    def test_short_text_single_chunk(self):
        """Test that short text returns single chunk"""
        text = "To jest krótki tekst."
        chunks = self.chunker.chunk_text(text)
        
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].text, text)
        self.assertEqual(chunks[0].chunk_id, 0)
    
    def test_long_text_multiple_chunks(self):
        """Test that long text is split into multiple chunks"""
        text = "To jest bardzo długi tekst. " * 10  # Will exceed max_chunk_size
        chunks = self.chunker.chunk_text(text, preserve_sentences=True)
        
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk.text) <= self.chunker.max_chunk_size for chunk in chunks))
    
    def test_sentence_preservation(self):
        """Test that sentence boundaries are preserved"""
        text = "Pierwsza wiadomość. Druga wiadomość! Trzecia wiadomość?"
        chunks = self.chunker.chunk_text(text, preserve_sentences=True)
        
        # Should preserve sentence endings
        for chunk in chunks:
            if chunk.text.count('.') > 0 or chunk.text.count('!') > 0 or chunk.text.count('?') > 0:
                # Chunk should end with proper punctuation or be the last chunk
                self.assertTrue(chunk.text.strip()[-1] in '.!?' or chunk == chunks[-1])
    
    def test_smart_sentence_splitting(self):
        """Test intelligent sentence splitting"""
        text = "Dr. Smith powiedział: 'To jest test.' Następnie dodał coś więcej."
        sentences = self.chunker.smart_split_by_sentences(text)
        
        # Should not break at "Dr." abbreviation
        self.assertTrue(any("Dr. Smith" in sentence for sentence in sentences))
        
        # Should properly split at actual sentence boundaries
        self.assertGreater(len(sentences), 1)
    
    def test_text_optimization_for_tts(self):
        """Test text optimization for better TTS pronunciation"""
        text = "Odwiedź www.example.com i napisz na test@email.com. Cena: 29.99€"
        optimized = self.chunker.optimize_text_for_tts(text)
        
        # Check replacements
        self.assertIn("w w w punkt", optimized)
        self.assertIn("małpa", optimized)
        self.assertIn("euro", optimized)
    
    def test_polish_abbreviations(self):
        """Test Polish abbreviation handling"""
        text = "np. to jest przykład itp."
        optimized = self.chunker.optimize_text_for_tts(text)
        
        self.assertIn("na przykład", optimized)
        self.assertIn("i tak dalej", optimized)
    
    def test_empty_text_handling(self):
        """Test handling of empty or whitespace text"""
        self.assertEqual(self.chunker.chunk_text(""), [])
        self.assertEqual(self.chunker.chunk_text("   "), [])
        self.assertEqual(len(self.chunker.chunk_text("a")), 1)
    
    def test_chunk_metadata(self):
        """Test that chunks contain proper metadata"""
        text = "Test " * 30  # Create text that will be chunked
        chunks = self.chunker.chunk_text(text)
        
        for i, chunk in enumerate(chunks):
            self.assertEqual(chunk.chunk_id, i)
            self.assertGreaterEqual(chunk.start_pos, 0)
            self.assertLessEqual(chunk.end_pos, len(text))
            self.assertGreater(len(chunk.text.strip()), 0)


class TestTTSConfig(unittest.TestCase):
    """Test cases for TTS configuration management"""
    
    def setUp(self):
        self.config = TTSConfig()
    
    def test_default_values(self):
        """Test that default configuration values are reasonable"""
        self.assertEqual(self.config.xtts_max_workers, 1)  # XTTS should be sequential
        self.assertGreater(self.config.edgetts_max_workers, 1)  # EdgeTTS can be parallel
        self.assertGreater(self.config.chunk_size, 0)
        self.assertTrue(self.config.enable_streaming)
    
    def test_feature_flags_defaults(self):
        """Test that feature flags have sensible defaults"""
        self.assertIsInstance(self.config.feature_flags, dict)
        # Streaming should be disabled by default until fully tested
        self.assertFalse(self.config.feature_flags.get("streaming_synthesis", True))


class TestConfigManager(unittest.TestCase):
    """Test cases for ConfigManager class"""
    
    def setUp(self):
        self.config_manager = ConfigManager()
    
    def test_config_access(self):
        """Test that configuration can be accessed"""
        config = self.config_manager.config
        self.assertIsInstance(config, TTSConfig)
    
    def test_feature_flag_management(self):
        """Test feature flag enable/disable functionality"""
        feature_name = "test_feature"
        
        # Enable feature
        self.config_manager.enable_feature(feature_name, True)
        self.assertTrue(self.config_manager.is_feature_enabled(feature_name))
        
        # Disable feature
        self.config_manager.enable_feature(feature_name, False)
        self.assertFalse(self.config_manager.is_feature_enabled(feature_name))
    
    def test_engine_max_workers(self):
        """Test engine-specific max workers configuration"""
        xtts_workers = self.config_manager.get_engine_max_workers("XTTS-v2")
        edgetts_workers = self.config_manager.get_engine_max_workers("Microsoft Edge TTS")
        
        self.assertEqual(xtts_workers, 1)  # Should be sequential
        self.assertGreater(edgetts_workers, 1)  # Should allow parallel processing
    
    def test_config_export(self):
        """Test configuration export functionality"""
        exported = self.config_manager.export_config()
        
        self.assertIsInstance(exported, dict)
        self.assertIn('performance', exported)
        self.assertIn('text_processing', exported)
        self.assertIn('streaming', exported)
        self.assertIn('feature_flags', exported)


class TestIntegration(unittest.TestCase):
    """Integration tests for text processing and configuration"""
    
    def test_chunker_with_config(self):
        """Test that TextChunker works with configuration values"""
        config = TTSConfig(chunk_size=50, chunk_overlap=10, min_chunk_size=5)
        chunker = TextChunker(
            max_chunk_size=config.chunk_size,
            overlap=config.chunk_overlap,
            min_chunk_size=config.min_chunk_size
        )
        
        text = "Test " * 20  # Create text longer than chunk_size
        chunks = chunker.chunk_text(text)
        
        # Verify chunks respect configuration
        for chunk in chunks:
            self.assertLessEqual(len(chunk.text), config.chunk_size)
            self.assertGreaterEqual(len(chunk.text.strip()), config.min_chunk_size)
    
    def test_performance_text_optimization(self):
        """Test that text optimization improves processing"""
        chunker = TextChunker()
        
        # Text with common issues
        problematic_text = "Sprawdź www.test.com i wyślij na admin@test.pl wiadomość o cenie 99.99€."
        optimized_text = chunker.optimize_text_for_tts(problematic_text)
        
        # Optimized text should be longer (more verbose)
        self.assertGreater(len(optimized_text), len(problematic_text))
        
        # Should not contain problematic patterns
        self.assertNotIn("@", optimized_text)
        self.assertNotIn("€", optimized_text)


if __name__ == '__main__':
    # Create a test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test cases
    suite.addTests(loader.loadTestsFromTestCase(TestTextChunker))
    suite.addTests(loader.loadTestsFromTestCase(TestTTSConfig))
    suite.addTests(loader.loadTestsFromTestCase(TestConfigManager))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Exit with appropriate code
    sys.exit(0 if result.wasSuccessful() else 1)
