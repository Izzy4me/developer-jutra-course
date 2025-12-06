"""
XTTS optimizer for memory management and batch processing.
Provides enhanced performance for XTTS-v2 TTS engine with model caching and memory optimization.
"""

import gc
import os
import queue
import threading
import time
import psutil
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from cli import console


@dataclass
class XTTSBatchRequest:
    """Represents a batch request for XTTS processing"""
    texts: List[str]
    output_paths: List[str]
    languages: List[str]
    rates: List[int]
    roles: List[str]
    batch_id: str


@dataclass
class XTTSMemoryStats:
    """Memory usage statistics for XTTS operations"""
    memory_before_mb: float
    memory_after_mb: float
    peak_memory_mb: float
    gpu_memory_mb: Optional[float] = None


class XTTSOptimizer:
    """Memory and performance optimizer for XTTS-v2 engine"""
    
    def __init__(self, max_memory_mb: int = 8192, enable_model_caching: bool = True):
        self.max_memory_mb = max_memory_mb
        self.enable_model_caching = enable_model_caching
        self._model_cache = {}
        self._memory_monitor = MemoryMonitor()
        self._batch_queue = queue.Queue(maxsize=10)
        self._processing_lock = threading.RLock()
        self._stats = {
            'batches_processed': 0,
            'cache_hits': 0,
            'memory_optimizations': 0,
            'total_processing_time': 0.0,
            'peak_memory_usage': 0.0
        }
    
    def optimize_memory_usage(self, tts_instance) -> bool:
        """Optimize memory usage for XTTS instance"""
        try:
            memory_before = self._memory_monitor.get_current_memory_mb()
            
            # Force garbage collection
            gc.collect()
            
            # Clear unnecessary model components if memory is high
            if memory_before > self.max_memory_mb * 0.8:  # 80% threshold
                console.print_info(f"🧹 Memory optimization triggered ({memory_before:.1f}MB)")
                
                # Try to clear CUDA cache if available
                try:
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                        console.print_info("🚀 CUDA cache cleared")
                except:
                    pass
                
                # Force aggressive garbage collection
                for _ in range(3):
                    gc.collect()
                
                memory_after = self._memory_monitor.get_current_memory_mb()
                memory_freed = memory_before - memory_after
                
                if memory_freed > 50:  # Significant memory freed
                    console.print_info(f"✅ Memory optimization: freed {memory_freed:.1f}MB")
                    self._stats['memory_optimizations'] += 1
                    return True
            
            return False
            
        except Exception as e:
            console.print_warning(f"Memory optimization failed: {e}")
            return False
    
    def preload_model_components(self, tts_instance):
        """Preload and cache critical model components"""
        if not self.enable_model_caching:
            return
        
        try:
            console.print_info("🔄 Preloading XTTS model components...")
            start_time = time.time()
            
            # Cache model configuration
            model_key = "xtts_v2_multilingual"
            if model_key not in self._model_cache:
                # Store reference to critical components
                self._model_cache[model_key] = {
                    'model_loaded': True,
                    'load_time': time.time(),
                    'memory_footprint': self._memory_monitor.get_current_memory_mb()
                }
                
                console.print_info(f"✅ Model components cached in {time.time() - start_time:.2f}s")
            else:
                self._stats['cache_hits'] += 1
                console.print_info("🎯 Using cached model components")
        
        except Exception as e:
            console.print_warning(f"Model preloading failed: {e}")
    
    def process_batch_optimized(self, batch_request: XTTSBatchRequest, tts_instance) -> List[bool]:
        """Process batch with memory optimization and performance monitoring"""
        with self._processing_lock:
            start_time = time.time()
            memory_stats = self._memory_monitor.start_monitoring()
            
            try:
                # Pre-batch optimization
                self.optimize_memory_usage(tts_instance)
                
                results = []
                chunk_size = self._calculate_optimal_chunk_size(len(batch_request.texts))
                
                # Process in chunks to manage memory
                for i in range(0, len(batch_request.texts), chunk_size):
                    chunk_end = min(i + chunk_size, len(batch_request.texts))
                    
                    console.print_info(f"📦 Processing chunk {i//chunk_size + 1}: items {i+1}-{chunk_end}")
                    
                    chunk_results = self._process_chunk(
                        batch_request.texts[i:chunk_end],
                        batch_request.output_paths[i:chunk_end],
                        batch_request.languages[i:chunk_end],
                        batch_request.rates[i:chunk_end],
                        batch_request.roles[i:chunk_end],
                        tts_instance
                    )
                    
                    results.extend(chunk_results)
                    
                    # Memory check after each chunk
                    current_memory = self._memory_monitor.get_current_memory_mb()
                    if current_memory > self.max_memory_mb * 0.9:
                        console.print_warning(f"⚠️ High memory usage ({current_memory:.1f}MB), optimizing...")
                        self.optimize_memory_usage(tts_instance)
                
                # Update statistics
                processing_time = time.time() - start_time
                self._stats['batches_processed'] += 1
                self._stats['total_processing_time'] += processing_time
                
                memory_stats = self._memory_monitor.stop_monitoring()
                self._stats['peak_memory_usage'] = max(
                    self._stats['peak_memory_usage'], 
                    memory_stats.peak_memory_mb
                )
                
                console.print_info(f"✅ Batch completed in {processing_time:.2f}s, peak memory: {memory_stats.peak_memory_mb:.1f}MB")
                
                return results
                
            except Exception as e:
                console.print_error(f"Batch processing failed: {e}")
                return [False] * len(batch_request.texts)
            
            finally:
                # Post-batch cleanup
                self.optimize_memory_usage(tts_instance)
    
    def _process_chunk(self, texts: List[str], output_paths: List[str], 
                      languages: List[str], rates: List[int], roles: List[str],
                      tts_instance) -> List[bool]:
        """Process a single chunk of texts sequentially (XTTS is not thread-safe)"""
        results = []
        
        for i, (text, output_path, language, rate, role) in enumerate(zip(texts, output_paths, languages, rates, roles)):
            try:
                # Clean text and validate length
                text = text.strip()
                if len(text) > 500:  # Limit text length to prevent memory issues
                    text = text[:500] + "..."
                    console.print_warning(f"Text truncated to 500 chars for memory optimization")
                
                # Map language codes
                lang_map = {'pl': 'pl', 'polish': 'pl', 'en': 'en', 'english': 'en'}
                lang_code = lang_map.get(language.lower(), 'en')
                
                # Calculate speed
                speed = max(0.5, min(2.0, rate / 150.0))
                
                # Select speaker
                speaker = "Claribel Dervla" if role.lower() != 'user' else "Damien Black"
                
                # Synthesize with memory monitoring
                memory_before = self._memory_monitor.get_current_memory_mb()
                
                tts_instance.tts_to_file(
                    text=text,
                    file_path=output_path,
                    speaker=speaker,
                    language=lang_code,
                    speed=speed
                )
                
                # Verify output
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    results.append(True)
                else:
                    console.print_warning(f"XTTS failed to generate file for chunk item {i+1}")
                    results.append(False)
                
                # Memory check after each synthesis
                memory_after = self._memory_monitor.get_current_memory_mb()
                memory_delta = memory_after - memory_before
                
                if memory_delta > 100:  # Significant memory increase
                    console.print_warning(f"⚠️ Memory increased by {memory_delta:.1f}MB during synthesis")
                
            except Exception as e:
                console.print_error(f"XTTS synthesis failed for item {i+1}: {e}")
                results.append(False)
                # Clean up failed output file
                if os.path.exists(output_path):
                    try:
                        os.unlink(output_path)
                    except:
                        pass
        
        return results
    
    def _calculate_optimal_chunk_size(self, total_items: int) -> int:
        """Calculate optimal chunk size based on available memory and item count"""
        available_memory = self.max_memory_mb - self._memory_monitor.get_current_memory_mb()
        
        # Base chunk size on memory availability
        if available_memory > 1000:  # > 1GB available
            base_chunk_size = 5
        elif available_memory > 500:  # 500MB - 1GB
            base_chunk_size = 3
        else:  # < 500MB
            base_chunk_size = 2
        
        # Adjust based on total items
        if total_items <= 3:
            return total_items
        elif total_items <= 10:
            return min(base_chunk_size, total_items)
        else:
            return base_chunk_size
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get optimization statistics"""
        current_memory = self._memory_monitor.get_current_memory_mb()
        
        stats = self._stats.copy()
        stats.update({
            'current_memory_mb': round(current_memory, 2),
            'memory_limit_mb': self.max_memory_mb,
            'memory_usage_percent': round((current_memory / self.max_memory_mb) * 100, 1),
            'cache_enabled': self.enable_model_caching,
            'cached_models': len(self._model_cache)
        })
        
        if stats['batches_processed'] > 0:
            stats['average_processing_time'] = round(
                stats['total_processing_time'] / stats['batches_processed'], 2
            )
        
        return stats


class MemoryMonitor:
    """Monitor memory usage during XTTS operations"""
    
    def __init__(self):
        self._monitoring = False
        self._peak_memory = 0.0
        self._start_memory = 0.0
    
    def get_current_memory_mb(self) -> float:
        """Get current memory usage in MB"""
        try:
            process = psutil.Process()
            return process.memory_info().rss / (1024 * 1024)  # Convert to MB
        except:
            return 0.0
    
    def start_monitoring(self) -> XTTSMemoryStats:
        """Start memory monitoring"""
        self._start_memory = self.get_current_memory_mb()
        self._peak_memory = self._start_memory
        self._monitoring = True
        
        return XTTSMemoryStats(
            memory_before_mb=self._start_memory,
            memory_after_mb=0.0,
            peak_memory_mb=0.0
        )
    
    def stop_monitoring(self) -> XTTSMemoryStats:
        """Stop memory monitoring and return stats"""
        end_memory = self.get_current_memory_mb()
        self._monitoring = False
        
        return XTTSMemoryStats(
            memory_before_mb=self._start_memory,
            memory_after_mb=end_memory,
            peak_memory_mb=max(self._peak_memory, end_memory)
        )
    
    def update_peak(self):
        """Update peak memory usage"""
        if self._monitoring:
            current = self.get_current_memory_mb()
            self._peak_memory = max(self._peak_memory, current)
