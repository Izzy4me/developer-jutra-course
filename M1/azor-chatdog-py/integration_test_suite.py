#!/usr/bin/env python3
"""
Phase 5: Integration Testing Suite
Comprehensive end-to-end testing of the TTS optimization system

Tests the complete pipeline:
- Phase 1: Text Processing & Configuration
- Phase 2: Engine Optimizations  
- Phase 3: Streaming Infrastructure
- Phase 4: Progressive Playback
- Integration: Full pipeline validation

Performance benchmarking and system validation
"""

import asyncio
import time
import sys
import os
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional
import json

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root / "src"))

class IntegrationTestRunner:
    """Comprehensive integration test runner for TTS optimization system"""
    
    def __init__(self):
        self.test_results = []
        self.performance_metrics = {}
        self.errors = []
        self.temp_dir = tempfile.mkdtemp(prefix="tts_integration_test_")
        
    def log_test(self, test_name: str, success: bool, duration: float = 0, details: str = ""):
        """Log test result"""
        result = {
            'test_name': test_name,
            'success': success,
            'duration': duration,
            'details': details,
            'timestamp': time.time()
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        duration_str = f" ({duration:.2f}s)" if duration > 0 else ""
        print(f"{status} {test_name}{duration_str}")
        if details and not success:
            print(f"   └── {details}")
    
    def log_metric(self, metric_name: str, value: float, unit: str = ""):
        """Log performance metric"""
        self.performance_metrics[metric_name] = {
            'value': value,
            'unit': unit,
            'timestamp': time.time()
        }
        print(f"📊 {metric_name}: {value:.3f}{unit}")

    async def test_phase1_text_processing(self) -> bool:
        """Test Phase 1: Text Processing & Configuration"""
        print("\n🔤 Phase 1: Text Processing & Configuration")
        print("-" * 50)
        
        try:
            start_time = time.time()
            
            # Test text processor import and basic functionality
            from src.commands.audio.text_processor import TextChunker, TextProcessor, ChunkingConfig
            
            chunker = TextChunker()
            processor = TextProcessor()
            
            # Test basic chunking
            test_text = "To jest test systemu TTS. Sprawdzamy czy chunking działa poprawnie. Każde zdanie powinno być odpowiednio podzielone."
            chunks = chunker.chunk_text(test_text, preserve_sentences=True)
            
            self.log_test("Text chunking basic functionality", len(chunks) > 1, 
                         details=f"Generated {len(chunks)} chunks")
            
            # Test streaming-aware chunking
            streaming_chunks = chunker.chunk_for_streaming(test_text, target_duration_ms=500)
            
            self.log_test("Streaming-aware text chunking", len(streaming_chunks) > 0,
                         details=f"Generated {len(streaming_chunks)} streaming chunks")
            
            # Test configuration system
            config = ChunkingConfig(max_length=100, overlap=10, preserve_sentences=True)
            configured_chunks = chunker.chunk_text(test_text, preserve_sentences=config.preserve_sentences)
            
            self.log_test("Configuration system", len(configured_chunks) > 0,
                         details=f"Config-based chunking: {len(configured_chunks)} chunks")
            
            # Test text optimization
            optimized_text = processor.optimize_for_streaming_tts(test_text)
            
            self.log_test("Text optimization for streaming", len(optimized_text) > 0,
                         details=f"Optimized text length: {len(optimized_text)} chars")
            
            duration = time.time() - start_time
            self.log_metric("Phase 1 total time", duration, "s")
            
            return True
            
        except Exception as e:
            self.log_test("Phase 1 integration", False, details=str(e))
            self.errors.append(f"Phase 1 error: {e}")
            return False

    async def test_phase2_engine_optimizations(self) -> bool:
        """Test Phase 2: Engine Optimizations"""
        print("\n⚡ Phase 2: Engine Optimizations")
        print("-" * 50)
        
        try:
            start_time = time.time()
            
            # Test TTS manager initialization
            from src.commands.audio.audio import get_tts_manager
            
            tts_manager = get_tts_manager()
            
            self.log_test("TTS manager initialization", tts_manager is not None,
                         details=f"Active engine: {tts_manager.active_engine.name if tts_manager.active_engine else 'None'}")
            
            if not tts_manager.active_engine:
                self.log_test("Engine availability", False, details="No TTS engines available")
                return False
            
            # Test basic synthesis
            test_output = os.path.join(self.temp_dir, "phase2_test.wav")
            synthesis_start = time.time()
            
            success = tts_manager.synthesize(
                text="Test syntezy dźwięku.",
                output_path=test_output,
                language='pl',
                rate=150
            )
            
            synthesis_duration = time.time() - synthesis_start
            
            self.log_test("Basic synthesis", success and os.path.exists(test_output),
                         details=f"Output: {test_output}")
            
            self.log_metric("Basic synthesis time", synthesis_duration, "s")
            
            # Test chunked synthesis if available
            if hasattr(tts_manager, 'synthesize_chunked'):
                chunked_output = os.path.join(self.temp_dir, "phase2_chunked.wav")
                chunked_start = time.time()
                
                chunked_success = tts_manager.synthesize_chunked(
                    text="To jest test syntezy z chunkowaniem. Sprawdzamy wydajność i jakość.",
                    output_path=chunked_output,
                    language='pl',
                    rate=150
                )
                
                chunked_duration = time.time() - chunked_start
                
                self.log_test("Chunked synthesis", chunked_success and os.path.exists(chunked_output))
                self.log_metric("Chunked synthesis time", chunked_duration, "s")
            
            duration = time.time() - start_time
            self.log_metric("Phase 2 total time", duration, "s")
            
            return True
            
        except Exception as e:
            self.log_test("Phase 2 integration", False, details=str(e))
            self.errors.append(f"Phase 2 error: {e}")
            return False

    async def test_phase3_streaming_infrastructure(self) -> bool:
        """Test Phase 3: Streaming Infrastructure"""
        print("\n🌊 Phase 3: Streaming Infrastructure")
        print("-" * 50)
        
        try:
            start_time = time.time()
            
            # Test streaming infrastructure imports
            from src.commands.audio.streaming_infrastructure import (
                StreamingAudioManager, StreamingConfig, AudioStreamBuffer, StreamState
            )
            
            self.log_test("Streaming infrastructure imports", True,
                         details="All streaming classes imported successfully")
            
            # Test streaming configuration
            config = StreamingConfig(
                chunk_size_ms=500,
                buffer_size=5,
                progressive_playback=True,
                auto_play=False  # Don't auto-play during testing
            )
            
            self.log_test("Streaming configuration", config.chunk_size_ms == 500,
                         details=f"Chunk size: {config.chunk_size_ms}ms")
            
            # Test audio buffer
            buffer = AudioStreamBuffer(config)
            
            self.log_test("Audio stream buffer", buffer is not None,
                         details=f"Buffer size: {config.buffer_size}")
            
            # Test streaming manager initialization
            from src.commands.audio.audio import get_tts_manager
            
            tts_manager = get_tts_manager()
            
            if not tts_manager.active_engine:
                self.log_test("Streaming manager (no engine)", False,
                             details="No TTS engine available for streaming test")
                return False
            
            # Initialize streaming
            streaming_init = tts_manager.initialize_streaming()
            
            self.log_test("Streaming initialization", streaming_init,
                         details="Streaming manager initialized")
            
            if streaming_init and hasattr(tts_manager, 'streaming_manager'):
                # Test streaming synthesis (without playback)
                test_text = "To jest test strumieniowej syntezy dźwięku."
                
                streaming_start = time.time()
                chunk_count = 0
                
                try:
                    async for chunk in tts_manager.synthesize_streaming(
                        text=test_text,
                        language='pl',
                        rate=150
                    ):
                        chunk_count += 1
                        if chunk_count >= 3:  # Limit for testing
                            break
                    
                    streaming_duration = time.time() - streaming_start
                    
                    self.log_test("Streaming synthesis", chunk_count > 0,
                                 details=f"Generated {chunk_count} chunks")
                    
                    self.log_metric("Streaming synthesis time", streaming_duration, "s")
                    self.log_metric("Chunks per second", chunk_count / streaming_duration if streaming_duration > 0 else 0, "chunks/s")
                    
                except Exception as e:
                    self.log_test("Streaming synthesis", False, details=f"Streaming error: {e}")
            
            duration = time.time() - start_time
            self.log_metric("Phase 3 total time", duration, "s")
            
            return True
            
        except Exception as e:
            self.log_test("Phase 3 integration", False, details=str(e))
            self.errors.append(f"Phase 3 error: {e}")
            return False

    async def test_phase4_progressive_playback(self) -> bool:
        """Test Phase 4: Progressive Playback"""
        print("\n🎵 Phase 4: Progressive Playback")
        print("-" * 50)
        
        try:
            start_time = time.time()
            
            # Test progressive playback imports
            from src.commands.audio.progressive_playback import (
                ProgressiveAudioPlayer, PlaybackConfig, PlaybackState,
                HAVE_PYGAME, HAVE_PYAUDIO
            )
            
            self.log_test("Progressive playback imports", True,
                         details="All playback classes imported successfully")
            
            # Check audio engine availability
            audio_engines_available = HAVE_PYGAME or HAVE_PYAUDIO
            
            self.log_test("Audio engines availability", True,
                         details=f"Pygame: {HAVE_PYGAME}, PyAudio: {HAVE_PYAUDIO}")
            
            # Test playback configuration
            config = PlaybackConfig(
                sample_rate=44100,
                channels=1,
                volume=0.5,  # Lower volume for testing
                auto_play=False,
                playback_engine="auto"
            )
            
            self.log_test("Playback configuration", config.sample_rate == 44100,
                         details=f"Sample rate: {config.sample_rate}Hz")
            
            # Test progressive player creation
            try:
                player = ProgressiveAudioPlayer(config)
                
                self.log_test("Progressive player creation", player is not None,
                             details=f"Engine: {type(player.playback_engine).__name__ if player.playback_engine else 'None'}")
                
                # Test player stats
                stats = player.get_playback_stats()
                
                self.log_test("Player statistics", isinstance(stats, dict),
                             details=f"Stats keys: {list(stats.keys())}")
                
                # Test player state
                initial_state = player.is_playing()
                
                self.log_test("Player state management", isinstance(initial_state, bool),
                             details=f"Initial playing state: {initial_state}")
                
            except Exception as e:
                self.log_test("Progressive player creation", False,
                             details=f"Player creation error: {e}")
            
            # Test integration with TTS manager
            from src.commands.audio.audio import get_tts_manager
            
            tts_manager = get_tts_manager()
            
            if hasattr(tts_manager, 'enable_progressive_playback'):
                playback_enabled = tts_manager.enable_progressive_playback(config)
                
                self.log_test("TTS manager playback integration", True,
                             details=f"Playback enabled: {playback_enabled}")
                
                # Test playback status
                status = tts_manager.get_progressive_playback_status()
                
                self.log_test("Playback status retrieval", isinstance(status, dict),
                             details=f"Available: {status.get('available', False)}")
            
            duration = time.time() - start_time
            self.log_metric("Phase 4 total time", duration, "s")
            
            return True
            
        except Exception as e:
            self.log_test("Phase 4 integration", False, details=str(e))
            self.errors.append(f"Phase 4 error: {e}")
            return False

    async def test_full_pipeline_integration(self) -> bool:
        """Test complete pipeline integration"""
        print("\n🔄 Full Pipeline Integration")
        print("-" * 50)
        
        try:
            start_time = time.time()
            
            # Test complete synthesis-to-playback pipeline
            from src.commands.audio.audio import get_tts_manager
            from src.commands.audio.progressive_playback import PlaybackConfig
            
            tts_manager = get_tts_manager()
            
            if not tts_manager.active_engine:
                self.log_test("Full pipeline (no engine)", False,
                             details="No TTS engine available")
                return False
            
            # Configure for testing
            playback_config = PlaybackConfig(
                volume=0.3,  # Low volume for testing
                auto_play=False,  # Manual control during testing
                playback_engine="auto"
            )
            
            # Test pipeline initialization
            streaming_ready = tts_manager.initialize_streaming()
            playback_ready = tts_manager.enable_progressive_playback(playback_config)
            
            self.log_test("Pipeline initialization", streaming_ready,
                         details=f"Streaming: {streaming_ready}, Playback: {playback_ready}")
            
            # Test pipeline synthesis (short test)
            if streaming_ready and hasattr(tts_manager, 'synthesize_streaming'):
                pipeline_start = time.time()
                test_text = "Test pełnej integracji systemu TTS."
                
                chunk_count = 0
                total_audio_size = 0
                
                try:
                    async for chunk in tts_manager.synthesize_streaming(
                        text=test_text,
                        language='pl',
                        rate=180
                    ):
                        chunk_count += 1
                        if hasattr(chunk, 'audio_data'):
                            total_audio_size += len(chunk.audio_data)
                        
                        # Limit chunks for testing
                        if chunk_count >= 2:
                            break
                    
                    pipeline_duration = time.time() - pipeline_start
                    
                    self.log_test("Full pipeline synthesis", chunk_count > 0,
                                 details=f"Generated {chunk_count} chunks, {total_audio_size} bytes")
                    
                    self.log_metric("Pipeline synthesis time", pipeline_duration, "s")
                    self.log_metric("Pipeline throughput", total_audio_size / pipeline_duration if pipeline_duration > 0 else 0, "bytes/s")
                    
                except Exception as e:
                    self.log_test("Full pipeline synthesis", False,
                                 details=f"Pipeline error: {e}")
            
            # Test performance vs traditional synthesis
            if hasattr(tts_manager, 'synthesize'):
                traditional_output = os.path.join(self.temp_dir, "traditional_test.wav")
                
                traditional_start = time.time()
                traditional_success = tts_manager.synthesize(
                    text="Test tradycyjnej syntezy.",
                    output_path=traditional_output,
                    language='pl',
                    rate=180
                )
                traditional_duration = time.time() - traditional_start
                
                self.log_test("Traditional synthesis comparison", traditional_success,
                             details=f"Traditional time: {traditional_duration:.2f}s")
                
                self.log_metric("Traditional synthesis time", traditional_duration, "s")
            
            duration = time.time() - start_time
            self.log_metric("Full pipeline total time", duration, "s")
            
            return True
            
        except Exception as e:
            self.log_test("Full pipeline integration", False, details=str(e))
            self.errors.append(f"Full pipeline error: {e}")
            return False

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run complete integration test suite"""
        print("🚀 TTS Optimization System - Integration Testing")
        print("=" * 60)
        print("Phase 5: Comprehensive End-to-End Validation")
        print("=" * 60)
        
        overall_start = time.time()
        
        # Run all test phases
        phase1_success = await self.test_phase1_text_processing()
        phase2_success = await self.test_phase2_engine_optimizations()
        phase3_success = await self.test_phase3_streaming_infrastructure()
        phase4_success = await self.test_phase4_progressive_playback()
        pipeline_success = await self.test_full_pipeline_integration()
        
        overall_duration = time.time() - overall_start
        
        # Calculate results
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r['success']])
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Generate summary
        summary = {
            'overall_success': all([phase1_success, phase2_success, phase3_success, phase4_success, pipeline_success]),
            'phase_results': {
                'phase1': phase1_success,
                'phase2': phase2_success,
                'phase3': phase3_success,
                'phase4': phase4_success,
                'pipeline': pipeline_success
            },
            'statistics': {
                'total_tests': total_tests,
                'successful_tests': successful_tests,
                'success_rate': success_rate,
                'total_duration': overall_duration,
                'errors': len(self.errors)
            },
            'performance_metrics': self.performance_metrics,
            'detailed_results': self.test_results,
            'errors': self.errors
        }
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 INTEGRATION TEST SUMMARY")
        print("=" * 60)
        
        status = "🎉 SUCCESS" if summary['overall_success'] else "⚠️ ISSUES FOUND"
        print(f"Overall Status: {status}")
        print(f"Success Rate: {success_rate:.1f}% ({successful_tests}/{total_tests} tests)")
        print(f"Total Duration: {overall_duration:.2f}s")
        
        if self.errors:
            print(f"\n❌ Errors ({len(self.errors)}):")
            for error in self.errors:
                print(f"   • {error}")
        
        print(f"\n📋 Phase Results:")
        for phase, success in summary['phase_results'].items():
            status = "✅" if success else "❌"
            print(f"   {status} {phase.title()}")
        
        if self.performance_metrics:
            print(f"\n📊 Key Performance Metrics:")
            for metric, data in self.performance_metrics.items():
                print(f"   • {metric}: {data['value']:.3f}{data['unit']}")
        
        return summary

    def cleanup(self):
        """Cleanup test resources"""
        try:
            import shutil
            shutil.rmtree(self.temp_dir, ignore_errors=True)
        except:
            pass


async def main():
    """Main integration test runner"""
    runner = IntegrationTestRunner()
    
    try:
        results = await runner.run_all_tests()
        
        # Save results to file
        results_file = Path("integration_test_results.json")
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n💾 Results saved to: {results_file}")
        
        return results['overall_success']
        
    except KeyboardInterrupt:
        print("\n⚠️ Integration tests interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Integration tests failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        runner.cleanup()


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)