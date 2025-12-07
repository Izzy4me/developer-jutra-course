#!/usr/bin/env python3
"""
Phase 4 Progressive Playback Test
Test the complete TTS optimization system with real-time audio playback

Tests the full pipeline:
1. Text processing and chunking
2. Streaming audio synthesis 
3. Progressive chunk-based playback
4. Real-time audio output
"""

import asyncio
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from src.cli import console
from src.commands.audio.audio import get_tts_manager
from src.commands.audio.progressive_playback import PlaybackConfig


async def test_progressive_playback():
    """Test progressive playback with streaming TTS"""
    
    console.print_info("🚀 Phase 4 Progressive Playback Test")
    console.print_info("=" * 50)
    
    # Test text samples
    test_texts = [
        "Witaj! To jest test progresywnego odtwarzania dźwięku.",
        "System TTS został zoptymalizowany i teraz obsługuje strumieniowe generowanie oraz odtwarzanie audio w czasie rzeczywistym. To znacznie poprawia wydajność i doświadczenie użytkownika.",
        "Implementacja obejmuje chunking tekstów, asynchroniczne przetwarzanie oraz progresywne odtwarzanie przez silniki audio takie jak Pygame i PyAudio."
    ]
    
    # Initialize TTS manager
    tts_manager = get_tts_manager()
    console.print_info(f"📱 Active TTS Engine: {tts_manager.active_engine.name if tts_manager.active_engine else 'None'}")
    
    # Configure progressive playback
    playback_config = PlaybackConfig(
        sample_rate=44100,
        channels=1,
        volume=0.8,
        auto_play=True,
        playback_engine="auto",  # Auto-select best available
        buffer_size=1024
    )
    
    console.print_info("🎵 Configuring progressive playback...")
    
    # Test each sample text
    for i, text in enumerate(test_texts, 1):
        console.print_info(f"\n📝 Test {i}/3: '{text[:50]}...'")
        
        try:
            # Test progressive playback synthesis
            success = await tts_manager.synthesize_with_playback(
                text=text,
                language='pl',
                rate=150,
                role='assistant',
                playback_config=playback_config
            )
            
            if success:
                console.print_info(f"✅ Test {i} completed successfully")
                
                # Get playback statistics
                stats = tts_manager.get_progressive_playback_status()
                if stats.get('available'):
                    playback_stats = stats.get('statistics', {})
                    console.print_info(f"   📊 Chunks played: {playback_stats.get('chunks_played', 0)}")
                    console.print_info(f"   📊 Total playback time: {playback_stats.get('total_playback_time', 0):.2f}s")
                    console.print_info(f"   📊 Engine: {playback_stats.get('engine_type', 'Unknown')}")
                
            else:
                console.print_warning(f"⚠️ Test {i} failed")
            
            # Brief pause between tests
            await asyncio.sleep(1.0)
            
        except Exception as e:
            console.print_error(f"❌ Test {i} error: {e}")
    
    # Test playback controls
    console.print_info("\n🎛️ Testing playback controls...")
    
    try:
        # Start a longer test for controls
        control_text = "To jest dłuższy tekst do testowania kontrolek odtwarzania. Możemy wstrzymać, wznowić i zatrzymać odtwarzanie w trakcie syntezy. System obsługuje również kontrolę głośności i monitoring statusu odtwarzania."
        
        console.print_info("🎵 Starting playback control test...")
        
        # Start synthesis (non-blocking)
        synthesis_task = asyncio.create_task(
            tts_manager.synthesize_with_playback(
                text=control_text,
                language='pl',
                rate=140,
                playback_config=playback_config
            )
        )
        
        # Wait a moment then test controls
        await asyncio.sleep(2.0)
        
        console.print_info("⏸️ Pausing playback...")
        tts_manager.pause_progressive_playback()
        
        await asyncio.sleep(1.0)
        
        console.print_info("▶️ Resuming playback...")
        tts_manager.resume_progressive_playback()
        
        await asyncio.sleep(1.0)
        
        console.print_info("🔊 Testing volume control...")
        tts_manager.set_playback_volume(0.5)
        
        await asyncio.sleep(1.0)
        
        tts_manager.set_playback_volume(0.8)
        
        # Wait for synthesis to complete
        await synthesis_task
        
        console.print_info("✅ Playback controls test completed")
        
    except Exception as e:
        console.print_error(f"❌ Playback controls test error: {e}")
    
    # Final cleanup
    console.print_info("\n🧹 Cleaning up...")
    tts_manager.stop_progressive_playback()
    
    console.print_info("\n🎉 Phase 4 Progressive Playback Test Complete!")
    
    # Final statistics
    final_stats = tts_manager.get_progressive_playback_status()
    if final_stats.get('available'):
        stats = final_stats.get('statistics', {})
        console.print_info("📊 Final Statistics:")
        console.print_info(f"   └── Total chunks played: {stats.get('chunks_played', 0)}")
        console.print_info(f"   └── Total playback time: {stats.get('total_playback_time', 0):.2f}s")
        console.print_info(f"   └── Average chunk duration: {stats.get('average_chunk_duration', 0):.1f}ms")
        console.print_info(f"   └── Buffer underruns: {stats.get('buffer_underruns', 0)}")
        console.print_info(f"   └── Playback errors: {stats.get('playback_errors', 0)}")


async def test_audio_engines():
    """Test available audio engines"""
    console.print_info("\n🔍 Testing Available Audio Engines:")
    
    try:
        from src.commands.audio.progressive_playback import HAVE_PYGAME, HAVE_PYAUDIO
        
        console.print_info(f"   🎵 Pygame: {'✅ Available' if HAVE_PYGAME else '❌ Not available'}")
        console.print_info(f"   🔊 PyAudio: {'✅ Available' if HAVE_PYAUDIO else '❌ Not available'}")
        
        if not HAVE_PYGAME and not HAVE_PYAUDIO:
            console.print_warning("⚠️ No audio engines available - install pygame or pyaudio")
            console.print_info("   pip install pygame  # OR")
            console.print_info("   pip install pyaudio")
            return False
        
        return True
        
    except Exception as e:
        console.print_error(f"❌ Audio engine check failed: {e}")
        return False


async def main():
    """Main test function"""
    console.print_info("🚀 TTS Optimization System - Phase 4 Test")
    console.print_info("Progressive Playback with Real-time Audio")
    console.print_info("=" * 60)
    
    # Check audio engines first
    if not await test_audio_engines():
        console.print_error("❌ Cannot proceed without audio engines")
        return
    
    # Run progressive playback tests
    await test_progressive_playback()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print_warning("\n⚠️ Test interrupted by user")
    except Exception as e:
        console.print_error(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
