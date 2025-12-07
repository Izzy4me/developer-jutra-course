"""
XTTS-v2 Streaming Adapter
Enables streaming support for XTTS-v2 engine through chunked synthesis
"""

import asyncio
import tempfile
import os
import time
import concurrent.futures
from typing import AsyncGenerator, Optional

from cli import console
from .streaming_infrastructure import StreamingTTSEngine, AudioChunk
from .text_processor import TextChunker


class XTTSStreamingAdapter(StreamingTTSEngine):
    """
    Streaming adapter for XTTS-v2 engine.
    Provides streaming capabilities by chunking text and using the base engine.
    """
    
    def __init__(self, base_engine):
        self.base_engine = base_engine
        self.text_chunker = TextChunker()
        
    def supports_streaming(self) -> bool:
        """Check if streaming is supported (based on base engine availability)"""
        return self.base_engine.is_available
    
    def get_optimal_chunk_size(self) -> int:
        """Get optimal chunk size for XTTS streaming"""
        return 300  # 300ms chunks work well for XTTS
    
    async def synthesize_streaming(
        self, 
        text: str, 
        language: str = 'pl',
        rate: int = 150,
        role: str = 'default',
        **kwargs
    ) -> AsyncGenerator[AudioChunk, None]:
        """
        Generate streaming audio chunks using XTTS-v2 engine.
        
        Args:
            text: Input text to synthesize
            language: Target language  
            rate: Speech rate (WPM)
            role: Voice role/character
            
        Yields:
            AudioChunk: Audio chunks as they're generated
        """
        if not self.supports_streaming():
            console.print_error("❌ XTTS streaming not available - engine not ready")
            return
        
        console.print_info(f"🚀 Starting XTTS streaming synthesis: '{text[:50]}...'")
        
        # Chunk text for streaming
        text_chunks = self.text_chunker.chunk_for_streaming(
            text, 
            target_duration_ms=self.get_optimal_chunk_size()
        )
        
        console.print_info(f"📦 Generated {len(text_chunks)} text chunks for XTTS streaming")
        
        # Process chunks with thread pool to avoid asyncio conflicts
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            for chunk_id, text_chunk in enumerate(text_chunks):
                try:
                    # Generate temporary output path
                    temp_output = f'/tmp/xtts_stream_chunk_{chunk_id}_{int(time.time() * 1000)}.wav'
                    
                    console.print_info(f"🎵 Synthesizing XTTS chunk {chunk_id + 1}/{len(text_chunks)}: '{text_chunk[:30]}...'")
                    
                    # Run synthesis in thread pool to avoid event loop conflicts
                    synthesis_start = time.time()
                    
                    future = executor.submit(
                        self.base_engine.synthesize,
                        text_chunk,
                        temp_output,
                        language,
                        rate,
                        role
                    )
                    
                    # Await synthesis completion
                    success = await asyncio.wrap_future(future)
                    synthesis_duration = time.time() - synthesis_start
                    
                    if success and os.path.exists(temp_output):
                        # Read generated audio data
                        with open(temp_output, 'rb') as f:
                            audio_data = f.read()
                        
                        # Estimate duration (rough calculation for WAV)
                        # Assumes 44.1kHz, 16-bit, mono
                        estimated_duration_ms = self._estimate_audio_duration(audio_data)
                        
                        # Create audio chunk
                        chunk = AudioChunk(
                            chunk_id=chunk_id,
                            audio_data=audio_data,
                            duration_ms=estimated_duration_ms,
                            text_segment=text_chunk,
                            chunk_size=len(audio_data),
                            synthesis_time=synthesis_duration
                        )
                        
                        console.print_info(
                            f"✅ XTTS chunk {chunk_id}: {estimated_duration_ms:.1f}ms, "
                            f"{len(audio_data)} bytes, {synthesis_duration:.2f}s synthesis"
                        )
                        
                        # Cleanup temp file
                        try:
                            os.unlink(temp_output)
                        except OSError:
                            pass
                        
                        yield chunk
                        
                        # Small delay to prevent overwhelming the system
                        await asyncio.sleep(0.1)
                        
                    else:
                        console.print_warning(f"⚠️ Failed to generate XTTS chunk {chunk_id}: {text_chunk[:30]}...")
                        
                except Exception as e:
                    console.print_error(f"❌ XTTS streaming error for chunk {chunk_id}: {e}")
                    continue
        
        console.print_info("✅ XTTS streaming synthesis completed")
    
    def _estimate_audio_duration(self, audio_data: bytes) -> float:
        """
        Estimate audio duration from WAV file data.
        
        Args:
            audio_data: WAV file bytes
            
        Returns:
            float: Estimated duration in milliseconds
        """
        try:
            # WAV header analysis for duration estimation
            # This is a rough calculation - for production, use proper WAV parsing
            if len(audio_data) < 44:  # Minimum WAV header size
                return 0.0
            
            # Rough estimation based on file size
            # Assumes 44.1kHz, 16-bit, mono (2 bytes per sample)
            sample_rate = 44100
            bytes_per_sample = 2
            channels = 1
            
            # Subtract approximate header size (44 bytes)
            audio_bytes = len(audio_data) - 44
            
            # Calculate duration
            total_samples = audio_bytes / (bytes_per_sample * channels)
            duration_seconds = total_samples / sample_rate
            duration_ms = duration_seconds * 1000
            
            return max(0.0, duration_ms)
            
        except Exception:
            # Fallback estimation based on text length
            # Rough estimate: 150 WPM = 2.5 words per second
            # Average of 5 characters per word
            return len(audio_data) / 1000  # Very rough fallback


def create_xtts_streaming_adapter(base_engine):
    """
    Factory function to create XTTS streaming adapter.
    
    Args:
        base_engine: Base XTTS engine instance
        
    Returns:
        XTTSStreamingAdapter: Configured streaming adapter
    """
    adapter = XTTSStreamingAdapter(base_engine)
    
    if adapter.supports_streaming():
        console.print_info("✅ XTTS streaming adapter created successfully")
    else:
        console.print_warning("⚠️ XTTS streaming adapter created but base engine not available")
    
    return adapter


# Export for use in audio.py
__all__ = ['XTTSStreamingAdapter', 'create_xtts_streaming_adapter']