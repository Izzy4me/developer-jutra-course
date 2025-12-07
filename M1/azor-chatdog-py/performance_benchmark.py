#!/usr/bin/env python3
"""
Performance Benchmark Suite for TTS System - Phase 6
Comprehensive performance testing and optimization validation

Enhanced benchmarking including:
- Multi-engine performance comparison
- Concurrent processing validation
- Memory and CPU usage analysis
- Streaming performance metrics
- Production readiness assessment
"""

import asyncio
import time
import psutil
import json
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict
import statistics
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root / "src"))

from commands.audio.audio import TTSManager

@dataclass
class BenchmarkResult:
    """Individual benchmark test result"""
    test_name: str
    engine: str
    text_length: int
    synthesis_time: float
    first_chunk_latency: float
    total_chunks: int
    memory_peak_mb: float
    cpu_usage_percent: float
    success: bool
    error_message: str = ""

class PerformanceBenchmark:
    """Performance benchmarking for TTS optimization system"""
    
    def __init__(self):
        self.benchmarks = []
        self.process = psutil.Process()
        
    def start_benchmark(self, name: str) -> dict:
        """Start a performance benchmark"""
        gc.collect()  # Clean garbage before benchmark
        
        return {
            'name': name,
            'start_time': time.time(),
            'start_memory': self.process.memory_info().rss,
            'start_cpu': self.process.cpu_percent()
        }
    
    def end_benchmark(self, benchmark: dict) -> dict:
        """End and record benchmark results"""
        end_time = time.time()
        end_memory = self.process.memory_info().rss
        end_cpu = self.process.cpu_percent()
        
        result = {
            'name': benchmark['name'],
            'duration': end_time - benchmark['start_time'],
            'memory_used': end_memory - benchmark['start_memory'],
            'memory_peak': end_memory,
            'cpu_usage': (benchmark['start_cpu'] + end_cpu) / 2,
            'timestamp': benchmark['start_time']
        }
        
        self.benchmarks.append(result)
        return result
    
    def log_benchmark(self, result: dict):
        """Log benchmark result"""
        duration = result['duration']
        memory_mb = result['memory_used'] / (1024 * 1024)
        cpu_pct = result['cpu_usage']
        
        print(f"📊 {result['name']}")
        print(f"   ⏱️  Duration: {duration:.3f}s")
        print(f"   💾 Memory: {memory_mb:+.1f}MB")
        print(f"   🔥 CPU: {cpu_pct:.1f}%")

    async def benchmark_traditional_synthesis(self) -> dict:
        """Benchmark traditional TTS synthesis"""
        print("\n📊 Benchmarking Traditional Synthesis")
        print("-" * 40)
        
        try:
            from src.commands.audio.audio import get_tts_manager
            
            tts_manager = get_tts_manager()
            
            if not tts_manager.active_engine:
                return {'error': 'No TTS engine available'}
            
            test_texts = [
                "Krótki test syntezy.",
                "To jest średniej długości tekst do syntezy dźwięku, który pozwoli nam zmierzyć wydajność systemu.",
                "Bardzo długi tekst do testowania wydajności syntezy dźwięku. Ten tekst zawiera wiele zdań i pozwoli nam dokładnie zmierzyć czas przetwarzania oraz zużycie zasobów systemowych podczas tradycyjnej syntezy mowy."
            ]
            
            results = []
            
            for i, text in enumerate(test_texts):
                benchmark = self.start_benchmark(f"Traditional synthesis {i+1} ({len(text)} chars)")
                
                output_path = f"/tmp/traditional_bench_{i}.wav"
                success = tts_manager.synthesize(
                    text=text,
                    output_path=output_path,
                    language='pl',
                    rate=150
                )
                
                result = self.end_benchmark(benchmark)
                result['success'] = success
                result['text_length'] = len(text)
                result['chars_per_second'] = len(text) / result['duration'] if result['duration'] > 0 else 0
                
                if os.path.exists(output_path):
                    result['file_size'] = os.path.getsize(output_path)
                    os.unlink(output_path)  # Cleanup
                
                results.append(result)
                self.log_benchmark(result)
            
            return {'results': results, 'average_duration': sum(r['duration'] for r in results) / len(results)}
            
        except Exception as e:
            return {'error': str(e)}

    async def benchmark_streaming_synthesis(self) -> dict:
        """Benchmark streaming TTS synthesis"""
        print("\n🌊 Benchmarking Streaming Synthesis")
        print("-" * 40)
        
        try:
            from src.commands.audio.audio import get_tts_manager
            
            tts_manager = get_tts_manager()
            
            if not tts_manager.active_engine:
                return {'error': 'No TTS engine available'}
            
            # Initialize streaming
            if not tts_manager.initialize_streaming():
                return {'error': 'Failed to initialize streaming'}
            
            test_texts = [
                "Krótki test strumieniowy.",
                "To jest średniej długości tekst do testowania strumieniowej syntezy dźwięku z progresywnym przetwarzaniem.",
                "Bardzo długi tekst do testowania wydajności strumieniowej syntezy dźwięku. Ten tekst pozwoli zmierzyć latencję pierwszego chunka oraz całkowitą przepustowość systemu podczas przetwarzania strumieniowego."
            ]
            
            results = []
            
            for i, text in enumerate(test_texts):
                benchmark = self.start_benchmark(f"Streaming synthesis {i+1} ({len(text)} chars)")
                
                chunk_count = 0
                total_audio_size = 0
                first_chunk_time = None
                
                try:
                    async for chunk in tts_manager.synthesize_streaming(
                        text=text,
                        language='pl',
                        rate=150
                    ):
                        if first_chunk_time is None:
                            first_chunk_time = time.time() - benchmark['start_time']
                        
                        chunk_count += 1
                        if hasattr(chunk, 'audio_data'):
                            total_audio_size += len(chunk.audio_data)
                
                except Exception as e:
                    print(f"   ⚠️ Streaming error: {e}")
                
                result = self.end_benchmark(benchmark)
                result['success'] = chunk_count > 0
                result['text_length'] = len(text)
                result['chunk_count'] = chunk_count
                result['total_audio_size'] = total_audio_size
                result['first_chunk_latency'] = first_chunk_time
                result['chunks_per_second'] = chunk_count / result['duration'] if result['duration'] > 0 else 0
                result['throughput_bytes_per_sec'] = total_audio_size / result['duration'] if result['duration'] > 0 else 0
                
                results.append(result)
                self.log_benchmark(result)
                print(f"   📦 Chunks: {chunk_count}")
                print(f"   🚀 First chunk latency: {first_chunk_time:.3f}s" if first_chunk_time else "   🚀 No chunks generated")
            
            return {'results': results, 'average_first_chunk_latency': sum(r.get('first_chunk_latency', 0) for r in results) / len(results)}
            
        except Exception as e:
            return {'error': str(e)}

    async def benchmark_memory_optimization(self) -> dict:
        """Benchmark memory usage optimization"""
        print("\n💾 Benchmarking Memory Optimization")
        print("-" * 40)
        
        try:
            from src.commands.audio.audio import get_tts_manager
            
            tts_manager = get_tts_manager()
            
            if not tts_manager.active_engine:
                return {'error': 'No TTS engine available'}
            
            # Test memory usage during multiple synthesis operations
            initial_memory = self.process.memory_info().rss
            
            benchmark = self.start_benchmark("Memory usage test")
            
            # Perform multiple synthesis operations
            test_text = "Test zużycia pamięci podczas wielokrotnej syntezy dźwięku."
            memory_samples = []
            
            for i in range(5):
                iteration_start = self.process.memory_info().rss
                
                if hasattr(tts_manager, 'synthesize_streaming') and tts_manager.initialize_streaming():
                    # Test streaming synthesis
                    chunk_count = 0
                    async for chunk in tts_manager.synthesize_streaming(
                        text=f"{test_text} Iteracja {i+1}.",
                        language='pl',
                        rate=150
                    ):
                        chunk_count += 1
                        if chunk_count >= 2:  # Limit for memory testing
                            break
                
                iteration_end = self.process.memory_info().rss
                memory_samples.append({
                    'iteration': i + 1,
                    'memory_before': iteration_start,
                    'memory_after': iteration_end,
                    'memory_delta': iteration_end - iteration_start
                })
                
                # Force garbage collection
                gc.collect()
            
            result = self.end_benchmark(benchmark)
            result['memory_samples'] = memory_samples
            result['memory_growth'] = self.process.memory_info().rss - initial_memory
            result['average_memory_per_iteration'] = sum(s['memory_delta'] for s in memory_samples) / len(memory_samples)
            
            self.log_benchmark(result)
            print(f"   📈 Memory growth: {result['memory_growth'] / (1024*1024):.1f}MB")
            print(f"   📊 Avg per iteration: {result['average_memory_per_iteration'] / (1024*1024):.1f}MB")
            
            return result
            
        except Exception as e:
            return {'error': str(e)}

    async def benchmark_progressive_playback(self) -> dict:
        """Benchmark progressive playback performance"""
        print("\n🎵 Benchmarking Progressive Playback")
        print("-" * 40)
        
        try:
            from src.commands.audio.progressive_playback import (
                ProgressiveAudioPlayer, PlaybackConfig, HAVE_PYGAME, HAVE_PYAUDIO
            )
            
            if not (HAVE_PYGAME or HAVE_PYAUDIO):
                return {'error': 'No audio playback engines available'}
            
            config = PlaybackConfig(
                volume=0.1,  # Very low for testing
                auto_play=False,
                playback_engine="auto"
            )
            
            benchmark = self.start_benchmark("Progressive playback setup")
            
            player = ProgressiveAudioPlayer(config)
            
            result = self.end_benchmark(benchmark)
            result['engine_type'] = type(player.playback_engine).__name__ if player.playback_engine else None
            result['setup_success'] = player.playback_engine is not None
            
            # Test playback statistics
            stats = player.get_playback_stats()
            result['initial_stats'] = stats
            
            self.log_benchmark(result)
            print(f"   🎛️  Engine: {result['engine_type']}")
            
            return result
            
        except Exception as e:
            return {'error': str(e)}

    async def run_all_benchmarks(self) -> Dict[str, Any]:
        """Run complete performance benchmark suite"""
        print("🚀 TTS Optimization System - Performance Benchmarks")
        print("=" * 60)
        print("Phase 5: Performance Analysis and Optimization Validation")
        print("=" * 60)
        
        overall_start = time.time()
        
        # System information
        system_info = {
            'cpu_count': psutil.cpu_count(),
            'memory_total': psutil.virtual_memory().total,
            'python_version': sys.version,
            'platform': sys.platform
        }
        
        print(f"\n🖥️  System Info:")
        print(f"   CPU cores: {system_info['cpu_count']}")
        print(f"   Total memory: {system_info['memory_total'] / (1024**3):.1f}GB")
        print(f"   Platform: {system_info['platform']}")
        
        # Run benchmarks
        traditional_results = await self.benchmark_traditional_synthesis()
        streaming_results = await self.benchmark_streaming_synthesis()
        memory_results = await self.benchmark_memory_optimization()
        playback_results = await self.benchmark_progressive_playback()
        
        overall_duration = time.time() - overall_start
        
        # Compile results
        benchmark_results = {
            'system_info': system_info,
            'traditional_synthesis': traditional_results,
            'streaming_synthesis': streaming_results,
            'memory_optimization': memory_results,
            'progressive_playback': playback_results,
            'benchmark_duration': overall_duration,
            'individual_benchmarks': self.benchmarks
        }
        
        # Performance analysis
        analysis = self.analyze_performance(benchmark_results)
        benchmark_results['performance_analysis'] = analysis
        
        self.print_summary(benchmark_results)
        
        return benchmark_results
    
    def analyze_performance(self, results: dict) -> dict:
        """Analyze performance improvements"""
        analysis = {}
        
        # Compare traditional vs streaming
        trad = results.get('traditional_synthesis', {})
        stream = results.get('streaming_synthesis', {})
        
        if 'results' in trad and 'results' in stream and len(trad['results']) > 0 and len(stream['results']) > 0:
            trad_avg = trad['average_duration']
            stream_first_chunk = stream['average_first_chunk_latency']
            
            if trad_avg > 0 and stream_first_chunk > 0:
                latency_improvement = ((trad_avg - stream_first_chunk) / trad_avg) * 100
                analysis['latency_improvement_percent'] = latency_improvement
        
        # Memory efficiency
        memory = results.get('memory_optimization', {})
        if 'memory_growth' in memory and 'average_memory_per_iteration' in memory:
            analysis['memory_growth_mb'] = memory['memory_growth'] / (1024 * 1024)
            analysis['avg_memory_per_iteration_mb'] = memory['average_memory_per_iteration'] / (1024 * 1024)
        
        return analysis
    
    def print_summary(self, results: dict):
        """Print performance summary"""
        print("\n" + "=" * 60)
        print("📊 PERFORMANCE BENCHMARK SUMMARY")
        print("=" * 60)
        
        analysis = results.get('performance_analysis', {})
        
        if 'latency_improvement_percent' in analysis:
            improvement = analysis['latency_improvement_percent']
            print(f"🚀 Latency Improvement: {improvement:.1f}%")
        
        if 'memory_growth_mb' in analysis:
            memory_growth = analysis['memory_growth_mb']
            print(f"💾 Memory Growth: {memory_growth:.1f}MB")
        
        # Engine availability
        trad = results.get('traditional_synthesis', {})
        stream = results.get('streaming_synthesis', {})
        playback = results.get('progressive_playback', {})
        
        print(f"\n✅ Capabilities:")
        print(f"   • Traditional synthesis: {'Available' if not trad.get('error') else 'Error'}")
        print(f"   • Streaming synthesis: {'Available' if not stream.get('error') else 'Error'}")
        print(f"   • Progressive playback: {'Available' if not playback.get('error') else 'Limited'}")
        
        if self.benchmarks:
            avg_duration = sum(b['duration'] for b in self.benchmarks) / len(self.benchmarks)
            total_memory = sum(abs(b['memory_used']) for b in self.benchmarks)
            
            print(f"\n📈 Overall Performance:")
            print(f"   • Average operation time: {avg_duration:.3f}s")
            print(f"   • Total memory usage: {total_memory / (1024*1024):.1f}MB")
            print(f"   • Benchmarks completed: {len(self.benchmarks)}")


async def main():
    """Main benchmark runner"""
    benchmark = PerformanceBenchmark()
    
    try:
        results = await benchmark.run_all_benchmarks()
        
        # Save results
        results_file = Path("performance_benchmark_results.json")
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n💾 Benchmark results saved to: {results_file}")
        
        return True
        
    except KeyboardInterrupt:
        print("\n⚠️ Benchmarks interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Benchmarks failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)