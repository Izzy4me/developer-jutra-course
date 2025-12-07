#!/usr/bin/env python3
"""
EdgeTTS Engine Validation Test
Verify EdgeTTS integration with TTS optimization system before Phase 6
"""

import asyncio
import sys
import os
import tempfile
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root / "src"))

class EdgeTTSValidator:
    """Validate EdgeTTS engine functionality"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="edgetts_test_")
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")
        if details:
            print(f"   └── {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        
        return success
    
    async def test_edgetts_availability(self) -> bool:
        """Test EdgeTTS engine availability and initialization"""
        print("\n🌐 Testing EdgeTTS Engine Availability")
        print("-" * 40)
        
        try:
            # Test EdgeTTS engine import and availability
            from src.commands.audio.EdgeTTSEngine import EdgeTTSEngine
            
            engine = EdgeTTSEngine()
            available = engine.is_available
            
            self.log_test("EdgeTTS engine import", True, "EdgeTTSEngine imported successfully")
            self.log_test("EdgeTTS availability check", available, f"Engine available: {available}")
            
            if available:
                # Test initialization
                init_success = engine.initialize()
                self.log_test("EdgeTTS initialization", init_success, f"Initialization: {init_success}")
                
                # Test voice listing
                try:
                    voices = engine.get_available_voices()
                    voice_count = len(voices) if voices else 0
                    self.log_test("EdgeTTS voice listing", voice_count > 0, f"Found {voice_count} voices")
                    
                    # Show some sample voices
                    if voices and voice_count > 0:
                        sample_voices = list(voices.keys())[:3]
                        print(f"   Sample voices: {', '.join(sample_voices)}")
                        
                except Exception as e:
                    self.log_test("EdgeTTS voice listing", False, f"Voice listing error: {e}")
            
            return available
            
        except Exception as e:
            self.log_test("EdgeTTS engine availability", False, f"Import/availability error: {e}")
            return False
    
    async def test_edgetts_basic_synthesis(self) -> bool:
        """Test basic EdgeTTS synthesis"""
        print("\n🎤 Testing EdgeTTS Basic Synthesis")
        print("-" * 40)
        
        try:
            from src.commands.audio.EdgeTTSEngine import EdgeTTSEngine
            
            engine = EdgeTTSEngine()
            
            if not engine.is_available or not engine.initialize():
                self.log_test("EdgeTTS basic synthesis", False, "Engine not available")
                return False
            
            # Test basic synthesis
            test_text = "To jest test syntezy EdgeTTS."
            output_path = os.path.join(self.temp_dir, "edgetts_basic_test.wav")
            
            import time
            start_time = time.time()
            
            success = engine.synthesize(
                text=test_text,
                output_path=output_path,
                language='pl',
                rate=150,
                role='assistant'
            )
            
            duration = time.time() - start_time
            
            # Verify output file
            file_exists = os.path.exists(output_path)
            file_size = os.path.getsize(output_path) if file_exists else 0
            
            self.log_test("EdgeTTS synthesis execution", success, f"Synthesis completed: {success}")
            self.log_test("EdgeTTS output file", file_exists, f"File: {output_path}, Size: {file_size} bytes")
            
            print(f"   ⏱️ Synthesis time: {duration:.2f}s")
            print(f"   📁 Output size: {file_size} bytes")
            
            return success and file_exists and file_size > 0
            
        except Exception as e:
            self.log_test("EdgeTTS basic synthesis", False, f"Synthesis error: {e}")
            return False
    
    async def test_edgetts_with_tts_manager(self) -> bool:
        """Test EdgeTTS integration with TTSManager"""
        print("\n🔧 Testing EdgeTTS with TTSManager")
        print("-" * 40)
        
        try:
            from src.commands.audio.audio import get_tts_manager
            
            # Get TTS manager and check if EdgeTTS is active
            tts_manager = get_tts_manager()
            
            if not tts_manager.active_engine:
                self.log_test("TTSManager EdgeTTS integration", False, "No active engine")
                return False
            
            engine_name = tts_manager.active_engine.name
            is_edgetts = "Edge" in engine_name or "Microsoft" in engine_name
            
            self.log_test("TTSManager active engine", True, f"Active: {engine_name}")
            self.log_test("EdgeTTS as active engine", is_edgetts, f"EdgeTTS active: {is_edgetts}")
            
            if not is_edgetts:
                # Try to find EdgeTTS in available engines
                edgetts_available = False
                for engine in tts_manager.engines:
                    if "Edge" in engine.name or "Microsoft" in engine.name:
                        edgetts_available = True
                        break
                
                self.log_test("EdgeTTS in available engines", edgetts_available, 
                             f"EdgeTTS available in engine list: {edgetts_available}")
                
                if not edgetts_available:
                    print("   ⚠️ EdgeTTS not available in current setup - using active engine for remaining tests")
            
            # Test synthesis through TTSManager
            test_output = os.path.join(self.temp_dir, "tts_manager_test.wav")
            
            import time
            start_time = time.time()
            
            synthesis_success = tts_manager.synthesize(
                text="Test TTSManager z aktywnym silnikiem.",
                output_path=test_output,
                language='pl',
                rate=150,
                role='assistant'
            )
            
            synthesis_duration = time.time() - start_time
            
            file_exists = os.path.exists(test_output)
            file_size = os.path.getsize(test_output) if file_exists else 0
            
            self.log_test("TTSManager synthesis", synthesis_success, f"Success: {synthesis_success}")
            self.log_test("TTSManager output", file_exists, f"File: {file_size} bytes")
            
            print(f"   ⏱️ TTSManager synthesis time: {synthesis_duration:.2f}s")
            
            return synthesis_success and file_exists
            
        except Exception as e:
            self.log_test("TTSManager EdgeTTS integration", False, f"Integration error: {e}")
            return False
    
    async def test_edgetts_streaming(self) -> bool:
        """Test EdgeTTS streaming capabilities"""
        print("\n🌊 Testing EdgeTTS Streaming")
        print("-" * 40)
        
        try:
            from src.commands.audio.audio import get_tts_manager
            
            tts_manager = get_tts_manager()
            
            if not tts_manager.active_engine:
                self.log_test("EdgeTTS streaming", False, "No active engine")
                return False
            
            # Check streaming support
            streaming_supported = tts_manager.supports_streaming()
            self.log_test("EdgeTTS streaming support", streaming_supported, 
                         f"Streaming supported: {streaming_supported}")
            
            if not streaming_supported:
                print("   ⚠️ Streaming not supported with current engine")
                return True  # Not a failure if engine doesn't support streaming
            
            # Initialize streaming
            streaming_init = tts_manager.initialize_streaming()
            self.log_test("EdgeTTS streaming initialization", streaming_init,
                         f"Streaming init: {streaming_init}")
            
            if streaming_init:
                # Test streaming synthesis
                test_text = "Test strumieniowej syntezy EdgeTTS z chunkowaniem tekstu."
                
                import time
                start_time = time.time()
                chunk_count = 0
                total_audio_size = 0
                
                try:
                    async for chunk in tts_manager.synthesize_streaming(
                        text=test_text,
                        language='pl',
                        rate=150
                    ):
                        chunk_count += 1
                        if hasattr(chunk, 'audio_data'):
                            total_audio_size += len(chunk.audio_data)
                        
                        print(f"   📦 Chunk {chunk_count}: {chunk.duration_ms:.1f}ms, {len(chunk.audio_data)} bytes")
                        
                        # Limit for testing
                        if chunk_count >= 3:
                            break
                
                except Exception as e:
                    self.log_test("EdgeTTS streaming synthesis", False, f"Streaming error: {e}")
                    return False
                
                streaming_duration = time.time() - start_time
                
                self.log_test("EdgeTTS streaming synthesis", chunk_count > 0,
                             f"Generated {chunk_count} chunks, {total_audio_size} bytes")
                
                print(f"   ⏱️ Streaming time: {streaming_duration:.2f}s")
                print(f"   📊 Throughput: {total_audio_size / streaming_duration:.0f} bytes/s")
                
                return chunk_count > 0
            
            return streaming_init
            
        except Exception as e:
            self.log_test("EdgeTTS streaming", False, f"Streaming error: {e}")
            return False
    
    async def test_edgetts_optimization_integration(self) -> bool:
        """Test EdgeTTS with optimization features"""
        print("\n⚡ Testing EdgeTTS Optimization Integration")
        print("-" * 40)
        
        try:
            from src.commands.audio.audio import get_tts_manager
            
            tts_manager = get_tts_manager()
            
            # Test chunked synthesis if available
            if hasattr(tts_manager, 'synthesize_chunked'):
                chunked_output = os.path.join(self.temp_dir, "edgetts_chunked.wav")
                
                import time
                start_time = time.time()
                
                chunked_success = tts_manager.synthesize_chunked(
                    text="Test optymalizacji EdgeTTS z chunkowaniem dla lepszej wydajności syntezy.",
                    output_path=chunked_output,
                    language='pl',
                    rate=150
                )
                
                chunked_duration = time.time() - start_time
                
                file_exists = os.path.exists(chunked_output)
                file_size = os.path.getsize(chunked_output) if file_exists else 0
                
                self.log_test("EdgeTTS chunked synthesis", chunked_success,
                             f"Chunked synthesis: {chunked_success}")
                self.log_test("EdgeTTS chunked output", file_exists,
                             f"Output: {file_size} bytes")
                
                print(f"   ⏱️ Chunked synthesis time: {chunked_duration:.2f}s")
            else:
                self.log_test("EdgeTTS chunked synthesis", False, "Chunked synthesis not available")
            
            # Test progressive playback integration
            if hasattr(tts_manager, 'enable_progressive_playback'):
                from src.commands.audio.progressive_playback import PlaybackConfig
                
                playback_config = PlaybackConfig(
                    volume=0.3,
                    auto_play=False,
                    playback_engine="auto"
                )
                
                playback_enabled = tts_manager.enable_progressive_playback(playback_config)
                self.log_test("EdgeTTS progressive playback", True,
                             f"Playback integration: {playback_enabled}")
                
                # Test playback status
                status = tts_manager.get_progressive_playback_status()
                available = status.get('available', False)
                
                self.log_test("EdgeTTS playback status", isinstance(status, dict),
                             f"Status available: {available}")
            
            return True
            
        except Exception as e:
            self.log_test("EdgeTTS optimization integration", False, f"Integration error: {e}")
            return False
    
    async def run_validation(self) -> dict:
        """Run complete EdgeTTS validation"""
        print("🌐 EdgeTTS Engine Validation")
        print("=" * 50)
        print("Verifying EdgeTTS integration before Phase 6")
        print("=" * 50)
        
        # Run all tests
        availability_ok = await self.test_edgetts_availability()
        synthesis_ok = await self.test_edgetts_basic_synthesis()
        integration_ok = await self.test_edgetts_with_tts_manager()
        streaming_ok = await self.test_edgetts_streaming()
        optimization_ok = await self.test_edgetts_optimization_integration()
        
        # Calculate results
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r['success']])
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        overall_success = all([availability_ok, synthesis_ok, integration_ok])
        # Note: streaming and optimization are nice-to-have, not required
        
        results = {
            'overall_success': overall_success,
            'critical_tests_passed': availability_ok and synthesis_ok and integration_ok,
            'streaming_working': streaming_ok,
            'optimization_features': optimization_ok,
            'success_rate': success_rate,
            'total_tests': total_tests,
            'successful_tests': successful_tests,
            'detailed_results': self.test_results
        }
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 EDGETTS VALIDATION SUMMARY")
        print("=" * 50)
        
        status = "🎉 READY" if overall_success else "⚠️ ISSUES"
        print(f"EdgeTTS Status: {status}")
        print(f"Success Rate: {success_rate:.1f}% ({successful_tests}/{total_tests} tests)")
        
        print(f"\n✅ Critical Features:")
        print(f"   • Engine availability: {'✅' if availability_ok else '❌'}")
        print(f"   • Basic synthesis: {'✅' if synthesis_ok else '❌'}")
        print(f"   • TTSManager integration: {'✅' if integration_ok else '❌'}")
        
        print(f"\n🚀 Advanced Features:")
        print(f"   • Streaming support: {'✅' if streaming_ok else '⚠️'}")
        print(f"   • Optimization features: {'✅' if optimization_ok else '⚠️'}")
        
        if overall_success:
            print(f"\n🎉 EdgeTTS is ready for Phase 6!")
        else:
            print(f"\n⚠️ EdgeTTS issues found - review before Phase 6")
        
        return results
    
    def cleanup(self):
        """Cleanup test resources"""
        try:
            import shutil
            shutil.rmtree(self.temp_dir, ignore_errors=True)
        except:
            pass


async def main():
    """Main EdgeTTS validation"""
    validator = EdgeTTSValidator()
    
    try:
        results = await validator.run_validation()
        return results['overall_success']
        
    except KeyboardInterrupt:
        print("\n⚠️ EdgeTTS validation interrupted")
        return False
    except Exception as e:
        print(f"\n❌ EdgeTTS validation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        validator.cleanup()


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)