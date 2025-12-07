"""
Text processing utilities for TTS optimization.
Handles text chunking, sentence splitting, and preprocessing for better TTS performance.
"""

import re
from typing import List, Optional
from dataclasses import dataclass


@dataclass
class TextChunk:
    """Represents a chunk of text for TTS processing"""
    text: str
    start_pos: int
    end_pos: int
    chunk_id: int


@dataclass
class ChunkingConfig:
    """Configuration for text chunking"""
    max_length: int = 500
    overlap: int = 50
    preserve_sentences: bool = True
    min_chunk_size: int = 50


class TextProcessor:
    """Enhanced text processor for streaming TTS optimization"""
    
    def __init__(self):
        self.chunker = TextChunker()
    
    def optimize_for_streaming_tts(self, text: str) -> str:
        """Optimize text for streaming TTS processing"""
        # Basic text cleaning and optimization
        optimized = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        optimized = optimized.strip()
        
        # Remove excessive punctuation
        optimized = re.sub(r'[.]{2,}', '...', optimized)
        optimized = re.sub(r'[!]{2,}', '!', optimized)
        optimized = re.sub(r'[?]{2,}', '?', optimized)
        
        return optimized
    
    def stream_text_progressively(self, text: str, chunk_size_ms: int = 500):
        """Stream text chunks progressively for real-time processing"""
        chunks = self.chunker.chunk_for_streaming(text, target_duration_ms=chunk_size_ms)
        for chunk in chunks:
            yield chunk


class TextChunker:
    """Handles intelligent text chunking for optimal TTS processing"""
    
    def __init__(self, max_chunk_size: int = 500, overlap: int = 50, min_chunk_size: int = 50):
        self.max_chunk_size = max_chunk_size
        self.overlap = overlap
        self.min_chunk_size = min_chunk_size
        
        # Sentence boundary patterns for Polish and English
        self.sentence_patterns = [
            r'[.!?]+\s+',  # Standard sentence endings
            r'[.!?]+$',    # End of text
            r':\s+',       # Colon followed by space (lists, explanations)
            r';\s+',       # Semicolon (complex sentences)
        ]
        
        # Patterns to avoid breaking (abbreviations, etc.)
        self.no_break_patterns = [
            r'\b[A-Z][a-z]*\.',  # Abbreviations like "Mr.", "Dr."
            r'\b\d+\.\d+',       # Numbers like "3.14"
            r'\bwww\.',          # URLs
            r'\b[a-z]+\.com',    # Domain names
        ]
    
    def chunk_text(self, text: str, preserve_sentences: bool = True) -> List[TextChunk]:
        """
        Split text into optimal chunks for TTS processing.
        
        Args:
            text: Input text to chunk
            preserve_sentences: Whether to preserve sentence boundaries
            
        Returns:
            List of TextChunk objects
        """
        if not text or len(text.strip()) == 0:
            return []
        
        text = text.strip()
        
        # If text is short enough, return as single chunk
        if len(text) <= self.max_chunk_size:
            return [TextChunk(text=text, start_pos=0, end_pos=len(text), chunk_id=0)]
        
        if preserve_sentences:
            return self._chunk_by_sentences(text)
        else:
            return self._chunk_by_size(text)
    
    def _chunk_by_sentences(self, text: str) -> List[TextChunk]:
        """Split text preserving sentence boundaries"""
        sentences = self.smart_split_by_sentences(text)
        chunks = []
        current_chunk = ""
        current_start = 0
        chunk_id = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # Check if adding this sentence would exceed chunk size
            potential_chunk = current_chunk + (" " if current_chunk else "") + sentence
            
            if len(potential_chunk) <= self.max_chunk_size:
                current_chunk = potential_chunk
            else:
                # Save current chunk if it has content
                if current_chunk and len(current_chunk) >= self.min_chunk_size:
                    chunks.append(TextChunk(
                        text=current_chunk.strip(),
                        start_pos=current_start,
                        end_pos=current_start + len(current_chunk),
                        chunk_id=chunk_id
                    ))
                    chunk_id += 1
                    current_start += len(current_chunk)
                
                # Start new chunk with current sentence
                current_chunk = sentence
        
        # Add final chunk if it has content
        if current_chunk and len(current_chunk.strip()) >= self.min_chunk_size:
            chunks.append(TextChunk(
                text=current_chunk.strip(),
                start_pos=current_start,
                end_pos=current_start + len(current_chunk),
                chunk_id=chunk_id
            ))
        
        return chunks if chunks else [TextChunk(text=text, start_pos=0, end_pos=len(text), chunk_id=0)]
    
    def _chunk_by_size(self, text: str) -> List[TextChunk]:
        """Split text by fixed size with overlap"""
        chunks = []
        chunk_id = 0
        start = 0
        
        while start < len(text):
            end = min(start + self.max_chunk_size, len(text))
            
            # Try to find a good break point (space, punctuation)
            if end < len(text):
                # Look backwards for a space or punctuation
                for i in range(end - 1, max(start, end - 100), -1):
                    if text[i] in ' \t\n.,;:!?':
                        end = i + 1
                        break
            
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(TextChunk(
                    text=chunk_text,
                    start_pos=start,
                    end_pos=end,
                    chunk_id=chunk_id
                ))
                chunk_id += 1
            
            # Move start position with overlap
            start = max(start + 1, end - self.overlap)
        
        return chunks
    
    def smart_split_by_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences with intelligent handling of abbreviations and edge cases.
        
        Args:
            text: Input text to split
            
        Returns:
            List of sentences
        """
        # First, protect abbreviations and special patterns
        protected_text = text
        protections = {}
        protection_id = 0
        
        for pattern in self.no_break_patterns:
            matches = re.finditer(pattern, protected_text, re.IGNORECASE)
            for match in reversed(list(matches)):  # Reverse to maintain positions
                placeholder = f"__PROTECT_{protection_id}__"
                protections[placeholder] = match.group()
                protected_text = (protected_text[:match.start()] + 
                                placeholder + 
                                protected_text[match.end():])
                protection_id += 1
        
        # Split by sentence patterns
        sentences = []
        current_pos = 0
        
        for pattern in self.sentence_patterns:
            matches = list(re.finditer(pattern, protected_text))
            for match in matches:
                sentence = protected_text[current_pos:match.end()].strip()
                if sentence:
                    sentences.append(sentence)
                current_pos = match.end()
        
        # Add remaining text if any
        if current_pos < len(protected_text):
            remaining = protected_text[current_pos:].strip()
            if remaining:
                sentences.append(remaining)
        
        # Restore protected patterns
        final_sentences = []
        for sentence in sentences:
            for placeholder, original in protections.items():
                sentence = sentence.replace(placeholder, original)
            final_sentences.append(sentence)
        
        return final_sentences if final_sentences else [text]
    
    def optimize_text_for_tts(self, text: str) -> str:
        """
        Optimize text for better TTS pronunciation.
        
        Args:
            text: Input text to optimize
            
        Returns:
            Optimized text
        """
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Handle common Polish TTS issues
        polish_replacements = {
            'www.': 'w w w punkt ',
            '@': ' małpa ',
            '&': ' i ',
            '%': ' procent',
            '€': ' euro',
            '$': ' dolar',
            '₹': ' rupia',
            '£': ' funt',
        }
        
        for old, new in polish_replacements.items():
            text = text.replace(old, new)
        
        # Handle numbers and dates
        text = re.sub(r'\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b', r'\1 \2 \3', text)  # Dates
        text = re.sub(r'\b(\d+)\.(\d+)\b', r'\1 przecinek \2', text)  # Decimals
        
        # Handle abbreviations
        abbreviations = {
            'np.': 'na przykład',
            'tzn.': 'to znaczy',
            'itp.': 'i tak dalej',
            'itd.': 'i tak dalej',
            'etc.': 'i tak dalej',
            'vs.': 'versus',
            'prof.': 'profesor',
            'dr.': 'doktor',
        }
        
        for abbr, full in abbreviations.items():
            text = re.sub(r'\b' + re.escape(abbr), full, text, flags=re.IGNORECASE)
        
        return text
    
    def chunk_for_streaming(self, text: str, target_duration_ms: int = 500) -> List[str]:
        """
        Chunk text optimally for streaming synthesis with target duration.
        
        Args:
            text: Input text to chunk for streaming
            target_duration_ms: Target duration per chunk in milliseconds
        
        Returns:
            List of text chunks optimized for streaming synthesis
        """
        # Calculate optimal chunk size based on target duration
        # Estimate: ~150 WPM average reading speed
        chars_per_second = (150 * 5) / 60  # ~12.5 chars/second
        target_chars = int((target_duration_ms / 1000) * chars_per_second)
        
        # Ensure reasonable bounds for streaming
        chunk_size = max(50, min(300, target_chars))
        
        # Use existing chunking but return just text strings
        text_chunks = self.chunk_text(text)
        return [chunk.text for chunk in text_chunks if len(chunk.text.strip()) > 0]
    
    def stream_text_progressively(self, text: str, chunk_size: int = 100):
        """
        Generator that yields text chunks progressively for real-time streaming.
        
        Args:
            text: Input text to stream
            chunk_size: Size of each text chunk in characters
        
        Yields:
            str: Progressive text chunks for streaming synthesis
        """
        if not text or not text.strip():
            return
        
        # Split into sentences first for natural boundaries
        sentences = self._split_into_sentences(text)
        current_chunk = ""
        
        for sentence in sentences:
            # If adding this sentence would exceed chunk size
            if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
                # Yield current chunk and start new one
                yield current_chunk.strip()
                current_chunk = sentence
            else:
                # Add sentence to current chunk
                current_chunk += (" " if current_chunk else "") + sentence
            
            # If chunk is large enough, yield it
            if len(current_chunk) >= chunk_size:
                yield current_chunk.strip()
                current_chunk = ""
        
        # Yield any remaining text
        if current_chunk.strip():
            yield current_chunk.strip()
    
    def optimize_for_streaming_tts(self, text: str) -> str:
        """
        Optimize text specifically for streaming TTS synthesis.
        Focuses on smooth audio transitions and natural speech flow.
        
        Args:
            text: Input text to optimize
        
        Returns:
            str: Streaming-optimized text
        """
        # Start with basic TTS optimization
        optimized = self.optimize_text_for_tts(text)
        
        # Additional streaming-specific optimizations
        
        # Add slight pauses between sentences for smoother streaming
        optimized = re.sub(r'([.!?])\s+', r'\1 ', optimized)
        
        # Ensure consistent spacing around punctuation for better chunking
        optimized = re.sub(r'\s*([,;:])\s*', r'\1 ', optimized)
        
        # Remove excessive whitespace that could affect streaming
        optimized = re.sub(r'\s{3,}', ' ', optimized)
        
        return optimized.strip()
