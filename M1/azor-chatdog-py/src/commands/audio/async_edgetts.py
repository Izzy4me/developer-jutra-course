"""
Async EdgeTTS processor for high-performance batch synthesis.
Provides concurrent processing capabilities for Microsoft Edge TTS engine.
"""

import asyncio
import os
import tempfile
import time
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
from cli import console
from .pydub_utils import HAVE_PYDUB, AudioSegment

# Import EdgeTTS at module level
try:
    import edge_tts
    HAVE_EDGE_TTS = True
except ImportError:
    edge_tts = None
    HAVE_EDGE_TTS = False


@dataclass
class TTSRequest:
    """Represents a single TTS synthesis request"""
    text: str
    output_path: str
    language: str = 'pl'
    rate: int = 150
    role: str = 'assistant'
    request_id: Optional[str] = None


@dataclass
class AudioResult:
    """Represents the result of a TTS synthesis operation"""
    success: bool
    output_path: str
    duration_ms: Optional[int] = None
    file_size: Optional[int] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None


class AsyncEdgeTTSProcessor:
    """High-performance async processor for EdgeTTS batch operations"""
    
    def __init__(self, max_concurrent: int = 8, session_timeout: int = 300):
        self.max_concurrent = max_concurrent
        self.session_timeout = session_timeout
        self._session_cache = {}
        self._voice_cache = {}
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'cache_hits': 0,
            'total_processing_time': 0.0
        }
    
    async def batch_synthesize(self, requests: List[TTSRequest]) -> List[AudioResult]:
        """
        Process multiple TTS requests concurrently with optimized batching.
        
        Args:
            requests: List of TTS synthesis requests
            
        Returns:
            List of AudioResult objects in the same order as requests
        """
        if not requests:
            return []
        
        console.print_info(f"🚀 Starting async EdgeTTS batch processing ({len(requests)} requests)")
        start_time = time.time()
        
        # Create semaphore-controlled tasks
        tasks = []
        for i, request in enumerate(requests):
            if not request.request_id:
                request.request_id = f"req_{i:03d}"
            
            task = asyncio.create_task(
                self._process_single_request(request),
                name=f"tts_task_{request.request_id}"
            )
            tasks.append(task)
        
        # Execute all tasks concurrently with progress monitoring
        results = await self._execute_with_progress(tasks, requests)
        
        # Update statistics
        total_time = time.time() - start_time
        self._stats['total_requests'] += len(requests)
        self._stats['total_processing_time'] += total_time
        
        success_count = sum(1 for r in results if r.success)
        self._stats['successful_requests'] += success_count
        self._stats['failed_requests'] += len(requests) - success_count
        
        console.print_info(f"✅ Async batch completed: {success_count}/{len(requests)} success in {total_time:.2f}s")
        
        return results
    
    async def _execute_with_progress(self, tasks: List[asyncio.Task], requests: List[TTSRequest]) -> List[AudioResult]:
        """Execute tasks with progress monitoring and timeout handling"""
        try:
            # Use asyncio.gather for simpler result handling
            console.print_info(f"🚀 Executing {len(tasks)} tasks with gather...")
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True), 
                timeout=self.session_timeout
            )
            
            # Process results and handle exceptions
            final_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    console.print_warning(f"⚠️ Task {i} failed: {result}")
                    final_results.append(AudioResult(
                        success=False,
                        output_path=requests[i].output_path,
                        error=f"Task exception: {str(result)}"
                    ))
                elif isinstance(result, AudioResult):
                    console.print_info(f"✅ Task {i}: success={result.success}")
                    final_results.append(result)
                else:
                    console.print_warning(f"⚠️ Task {i} returned unexpected type: {type(result)}")
                    final_results.append(AudioResult(
                        success=False,
                        output_path=requests[i].output_path,
                        error=f"Unexpected result type: {type(result)}"
                    ))
            
            return final_results
        
        except asyncio.TimeoutError:
            console.print_error(f"❌ Batch timeout after {self.session_timeout}s")
            return [AudioResult(
                success=False,
                output_path=req.output_path,
                error="Batch timeout"
            ) for req in requests]
        
        except Exception as e:
            console.print_error(f"❌ Batch execution failed: {e}")
            return [AudioResult(
                success=False,
                output_path=req.output_path,
                error=f"Batch execution error: {str(e)}"
            ) for req in requests]
    
    async def _process_single_request(self, request: TTSRequest) -> AudioResult:
        """Process a single TTS request with async EdgeTTS"""
        async with self._semaphore:  # Limit concurrent operations
            start_time = time.time()
            
            try:
                console.print_info(f"🔧 Processing request: {request.text[:30]}...")
                
                # Check if EdgeTTS is available
                if not HAVE_EDGE_TTS:
                    console.print_error("❌ EdgeTTS module not available")
                    return AudioResult(
                        success=False,
                        output_path=request.output_path,
                        error="EdgeTTS module not available"
                    )
                
                console.print_info("✅ EdgeTTS module available")
                
                # Select voice based on language and role
                voice = self._get_voice_for_request(request)
                console.print_info(f"🎤 Selected voice: {voice}")
                
                # Calculate rate
                rate_str = self._calculate_rate_string(request.rate)
                console.print_info(f"⚡ Rate string: {rate_str}")
                
                # Check cache for voice configuration
                cache_key = f"{voice}_{rate_str}_{request.language}"
                if cache_key in self._voice_cache:
                    self._stats['cache_hits'] += 1
                    console.print_info("🎯 Cache hit for voice configuration")
                
                # Generate audio using EdgeTTS
                temp_mp3_path = request.output_path + '.temp.mp3'
                console.print_info(f"📁 Temp MP3 path: {temp_mp3_path}")
                
                try:
                    console.print_info("🔊 Creating EdgeTTS communicate object...")
                    communicate = edge_tts.Communicate(
                        text=request.text,
                        voice=voice,
                        rate=rate_str
                    )
                    console.print_info("✅ Communicate object created")
                    
                    # Save MP3 file
                    console.print_info(f"💾 Saving MP3 to {temp_mp3_path}...")
                    await communicate.save(temp_mp3_path)
                    console.print_info("✅ MP3 saved")
                    
                    # Verify MP3 was created
                    if not os.path.exists(temp_mp3_path):
                        console.print_error("❌ MP3 file does not exist")
                        return AudioResult(
                            success=False,
                            output_path=request.output_path,
                            error="EdgeTTS failed to generate MP3 file - file not created"
                        )
                    
                    mp3_size = os.path.getsize(temp_mp3_path)
                    if mp3_size == 0:
                        console.print_error("❌ MP3 file is empty")
                        return AudioResult(
                            success=False,
                            output_path=request.output_path,
                            error="EdgeTTS failed to generate MP3 file - file is empty"
                        )
                    
                    console.print_info(f"✅ MP3 file created: {mp3_size} bytes")
                    
                    # Convert MP3 to WAV
                    console.print_info("🔄 Starting MP3 to WAV conversion...")
                    conversion_success = await self._convert_mp3_to_wav_async(temp_mp3_path, request.output_path)
                    console.print_info(f"🔄 Conversion result: {conversion_success}")
                    
                    # Cleanup temp file
                    if os.path.exists(temp_mp3_path):
                        os.unlink(temp_mp3_path)
                        console.print_info("🗑️ Cleaned up temp MP3 file")
                    
                    if not conversion_success:
                        console.print_error("❌ MP3 to WAV conversion failed")
                        return AudioResult(
                            success=False,
                            output_path=request.output_path,
                            error="Failed to convert MP3 to WAV"
                        )
                    
                    # Get file info
                    file_size = os.path.getsize(request.output_path) if os.path.exists(request.output_path) else 0
                    processing_time = time.time() - start_time
                    
                    console.print_info(f"✅ Processing complete: {file_size} bytes, {processing_time:.2f}s")
                    
                    result = AudioResult(
                        success=True,
                        output_path=request.output_path,
                        file_size=file_size,
                        processing_time=processing_time
                    )
                    console.print_info(f"🎯 Returning success result for {request.output_path}")
                    return result
                    
                except Exception as e:
                    # Cleanup on error
                    if os.path.exists(temp_mp3_path):
                        try:
                            os.unlink(temp_mp3_path)
                        except:
                            pass
                    
                    return AudioResult(
                        success=False,
                        output_path=request.output_path,
                        error=f"EdgeTTS synthesis failed: {str(e)}",
                        processing_time=time.time() - start_time
                    )
            
            except Exception as e:
                console.print_error(f"❌ Async processing failed: {str(e)}")
                console.print_error(f"🐛 Exception type: {e.__class__.__name__}")
                import traceback
                console.print_error(f"🔍 Traceback: {traceback.format_exc()}")
                return AudioResult(
                    success=False,
                    output_path=request.output_path,
                    error=f"Async processing failed: {str(e)}",
                    processing_time=time.time() - start_time
                )
    
    def _get_voice_for_request(self, request: TTSRequest) -> str:
        """Get appropriate voice based on language and role"""
        if request.language.lower() in ['pl', 'polish']:
            if request.role.lower() == 'user':
                return "pl-PL-MarekNeural"  # Polish male voice
            else:
                return "pl-PL-ZofiaNeural"  # Polish female voice
        else:
            if request.role.lower() == 'user':
                return "en-US-ChristopherNeural"  # English male voice
            else:
                return "en-US-AriaNeural"  # English female voice
    
    def _calculate_rate_string(self, rate: int) -> str:
        """Convert rate to EdgeTTS format (+/- percentage)"""
        if rate < 150:
            speed_percentage = max(-50, ((rate - 150) / 150) * 100)
        else:
            speed_percentage = min(100, ((rate - 150) / 150) * 100)
        
        return f"{speed_percentage:+.0f}%"
    
    async def _convert_mp3_to_wav_async(self, mp3_path: str, wav_path: str) -> bool:
        """Convert MP3 to WAV asynchronously using thread pool"""
        def sync_convert():
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
                import subprocess
                result = subprocess.run([
                    'ffmpeg', '-y', '-loglevel', 'quiet',
                    '-i', mp3_path,
                    '-acodec', 'pcm_s16le',
                    '-ar', '22050',  # Reduced sample rate for faster processing
                    '-ac', '1',
                    wav_path
                ], capture_output=True, text=True)
                
                return result.returncode == 0 and os.path.exists(wav_path)
            except Exception as e:
                console.print_warning(f"FFmpeg conversion failed: {e}")
                return False
        
        # Run conversion in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=2) as executor:
            try:
                return await loop.run_in_executor(executor, sync_convert)
            except Exception as e:
                console.print_warning(f"Async conversion failed: {e}")
                return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get processing statistics"""
        if self._stats['total_requests'] > 0:
            avg_time = self._stats['total_processing_time'] / self._stats['total_requests']
            success_rate = (self._stats['successful_requests'] / self._stats['total_requests']) * 100
        else:
            avg_time = 0.0
            success_rate = 0.0
        
        return {
            'total_requests': self._stats['total_requests'],
            'successful_requests': self._stats['successful_requests'],
            'failed_requests': self._stats['failed_requests'],
            'success_rate_percent': round(success_rate, 2),
            'cache_hits': self._stats['cache_hits'],
            'average_processing_time': round(avg_time, 3),
            'total_processing_time': round(self._stats['total_processing_time'], 2)
        }
    
    def reset_statistics(self):
        """Reset processing statistics"""
        self._stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'cache_hits': 0,
            'total_processing_time': 0.0
        }
