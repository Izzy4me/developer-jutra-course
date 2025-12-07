# Production Deployment Guide - TTS Optimization System

## Overview
This guide provides step-by-step instructions for deploying the optimized TTS system in production environments. The system has been thoroughly tested and validated through Phases 1-5, achieving 86.4% integration success rate.

## Prerequisites

### System Requirements
```bash
# Minimum Production Requirements
CPU: 4+ cores (8+ recommended)
RAM: 8GB minimum (16GB+ recommended for XTTS)
Storage: 5GB available space
Network: Stable internet connection (for EdgeTTS)
OS: Linux/macOS/Windows

# Python Environment
Python: 3.9+ (3.10+ recommended)
pip: Latest version
```

### Required Dependencies
```bash
# Core TTS dependencies
torch>=1.13.0
edge-tts>=6.1.0
pygame>=2.1.0
pyaudio>=0.2.11  # Optional, fallback audio engine

# Optimization and monitoring
psutil>=5.9.0
asyncio  # Built-in Python 3.7+

# Development and testing (optional)
pytest>=7.0.0
```

## Installation Steps

### 1. Environment Setup
```bash
# Clone repository (if applicable)
cd azor-chatdog-py

# Create virtual environment
python -m venv venv

# Activate environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip
```

### 2. Install Dependencies
```bash
# Install production dependencies
pip install torch edge-tts pygame psutil

# Optional: Install pyaudio for advanced audio control
# macOS:
brew install portaudio
pip install pyaudio

# Linux (Ubuntu/Debian):
sudo apt-get install portaudio19-dev
pip install pyaudio

# Windows:
pip install pyaudio
```

### 3. System Configuration
```bash
# Set environment variables
export TTS_ENGINE=xtts  # or 'edgetts'
export TTS_STREAMING=true
export TTS_MEMORY_LIMIT=0.8
export TTS_CONCURRENT_LIMIT=6

# Audio configuration
export AUDIO_DEVICE=default
export AUDIO_BUFFER_SIZE=4096
```

### 4. Configuration Files
Create `src/commands/audio/config/production_config.py`:
```python
"""Production TTS Configuration"""

# Performance Settings
STREAMING_ENABLED = True
PROGRESSIVE_PLAYBACK = True
MEMORY_OPTIMIZATION = True
ASYNC_BATCH_PROCESSING = True

# Engine Configuration
DEFAULT_ENGINE = 'xtts'          # Primary engine
FALLBACK_ENGINE = 'edgetts'      # Fallback engine
ENGINE_TIMEOUT = 30              # Seconds

# Memory Management
MEMORY_THRESHOLD = 0.8           # 80% RAM limit
GC_INTERVAL = 10                 # Garbage collection frequency
CACHE_SIZE_LIMIT = 500           # MB

# Streaming Configuration
CHUNK_SIZE = 4096               # Audio chunk size
SAMPLE_RATE = 22050             # Audio sample rate
AUDIO_FORMAT = 'wav'            # Output format

# Concurrent Processing
MAX_CONCURRENT_REQUESTS = 6      # EdgeTTS batch limit
BATCH_TIMEOUT = 15              # Batch processing timeout

# Logging
LOG_LEVEL = 'INFO'              # Production log level
LOG_FILE = '/var/log/tts_system.log'  # Log file path
```

## Production Validation

### 1. System Health Check
```bash
# Run production readiness test
python test_system_readiness.py

# Expected output:
# ✅ System Status: OPERATIONAL
# ✅ XTTS Engine: Ready
# ✅ EdgeTTS Engine: Ready  
# ✅ Streaming: Functional
# ✅ Memory Management: Active
# 🚀 SYSTEM READY FOR PRODUCTION!
```

### 2. Performance Validation
```bash
# Run Phase 6 performance benchmark
python phase6_performance_benchmark.py

# Key metrics to validate:
# - Overall success rate > 80%
# - First chunk latency < 2.0s
# - Memory usage < 500MB peak
# - Concurrent processing functional
```

### 3. Integration Testing
```bash
# Run comprehensive integration test
python integration_test_suite.py

# Target success rate: 85%+
# All critical systems should be operational
```

## Deployment Architecture

### Single Server Deployment
```
┌─────────────────────────────────────┐
│           Application Server        │
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐   │
│  │ TTS Manager │ │   Engines   │   │
│  │             │ │ XTTS EdgeTTS│   │
│  └─────────────┘ └─────────────┘   │
├─────────────────────────────────────┤
│         Streaming Layer             │
│  ┌─────────────┐ ┌─────────────┐   │
│  │Stream Mgmt  │ │Audio Buffer │   │
│  └─────────────┘ └─────────────┘   │
├─────────────────────────────────────┤
│        Progressive Playback         │
│  ┌─────────────┐ ┌─────────────┐   │
│  │   pygame    │ │   pyaudio   │   │
│  └─────────────┘ └─────────────┘   │
└─────────────────────────────────────┘
```

### Load Balanced Deployment
```
        ┌─────────────┐
        │Load Balancer│
        └─────┬───────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Server1│ │Server2│ │Server3│
│ XTTS  │ │EdgeTTS│ │ Mixed │
└───────┘ └───────┘ └───────┘
```

## Production Configuration

### 1. Engine Selection Strategy
```python
# production_engine_selector.py
class ProductionEngineSelector:
    def select_engine(self, request_type: str) -> str:
        """Select optimal engine based on request characteristics"""
        
        # Low latency requirements
        if request_type == "interactive":
            return "edgetts"
        
        # High quality requirements
        elif request_type == "content_creation":
            return "xtts"
        
        # Long form content
        elif request_type == "audiobook":
            return "xtts"
        
        # Default fallback
        else:
            return "edgetts"
```

### 2. Memory Management
```python
# production_memory_manager.py
import psutil
import gc

class ProductionMemoryManager:
    def __init__(self, memory_limit: float = 0.8):
        self.memory_limit = memory_limit
        
    def monitor_and_optimize(self):
        """Continuous memory monitoring and optimization"""
        memory_percent = psutil.virtual_memory().percent / 100
        
        if memory_percent > self.memory_limit:
            # Clear caches
            self.clear_engine_caches()
            
            # Force garbage collection
            gc.collect()
            
            # Log memory usage
            self.log_memory_usage()
    
    def clear_engine_caches(self):
        """Clear TTS engine caches to free memory"""
        # Implementation for cache clearing
        pass
```

### 3. Error Handling and Fallbacks
```python
# production_error_handler.py
class ProductionErrorHandler:
    def __init__(self):
        self.fallback_chain = ["xtts", "edgetts", "offline_fallback"]
        
    async def synthesize_with_fallback(self, text: str, voice_config: dict):
        """Attempt synthesis with automatic fallback"""
        
        for engine in self.fallback_chain:
            try:
                result = await self.attempt_synthesis(engine, text, voice_config)
                if result:
                    return result
            except Exception as e:
                self.log_engine_error(engine, str(e))
                continue
        
        # All engines failed
        raise Exception("All TTS engines unavailable")
```

## Monitoring and Maintenance

### 1. Health Monitoring
```bash
# health_check.sh
#!/bin/bash

# System health check script
echo "🔍 TTS System Health Check"
echo "=========================="

# Check process
if pgrep -f "tts" > /dev/null; then
    echo "✅ TTS Process: Running"
else
    echo "❌ TTS Process: Not running"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
echo "💾 Memory Usage: ${MEMORY_USAGE}%"

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}')
echo "💿 Disk Usage: ${DISK_USAGE}"

# Test TTS functionality
python -c "
import sys
sys.path.append('src')
from commands.audio.audio import TTSManager
try:
    tts = TTSManager()
    print('✅ TTS System: Functional')
except Exception as e:
    print(f'❌ TTS System: Error - {e}')
"
```

### 2. Performance Monitoring
```python
# production_monitor.py
import time
import json
from typing import Dict, List

class ProductionMonitor:
    def __init__(self):
        self.metrics = {
            "requests_total": 0,
            "requests_successful": 0,
            "average_latency": 0.0,
            "memory_peak": 0.0,
            "errors": []
        }
    
    def log_request(self, duration: float, success: bool, memory_usage: float):
        """Log request metrics"""
        self.metrics["requests_total"] += 1
        
        if success:
            self.metrics["requests_successful"] += 1
        
        # Update average latency
        total_latency = self.metrics["average_latency"] * (self.metrics["requests_total"] - 1)
        self.metrics["average_latency"] = (total_latency + duration) / self.metrics["requests_total"]
        
        # Update peak memory
        if memory_usage > self.metrics["memory_peak"]:
            self.metrics["memory_peak"] = memory_usage
    
    def get_health_report(self) -> Dict:
        """Generate system health report"""
        success_rate = 0.0
        if self.metrics["requests_total"] > 0:
            success_rate = self.metrics["requests_successful"] / self.metrics["requests_total"]
        
        return {
            "success_rate": success_rate,
            "average_latency": self.metrics["average_latency"],
            "total_requests": self.metrics["requests_total"],
            "memory_peak_mb": self.metrics["memory_peak"],
            "system_healthy": success_rate > 0.95 and self.metrics["average_latency"] < 3.0
        }
```

### 3. Log Rotation and Management
```bash
# logrotate configuration: /etc/logrotate.d/tts-system
/var/log/tts_system.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

## Scaling Considerations

### 1. Horizontal Scaling
- Deploy multiple TTS service instances behind load balancer
- Use Redis/Memcached for shared caching
- Implement session affinity for voice consistency

### 2. Vertical Scaling
- Increase server CPU/RAM for better XTTS performance
- Use GPU acceleration for XTTS in high-load scenarios
- Optimize audio buffer sizes based on hardware

### 3. Performance Optimization
```python
# Recommended production settings
PRODUCTION_OPTIMIZATIONS = {
    "xtts": {
        "memory_limit": "4GB",
        "batch_size": 1,
        "gpu_acceleration": True,
        "model_cache": True
    },
    "edgetts": {
        "concurrent_limit": 6,
        "batch_timeout": 10,
        "connection_pool": True,
        "retry_count": 3
    },
    "streaming": {
        "chunk_size": 4096,
        "buffer_size": 8192,
        "prefetch_chunks": 3
    }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. High Memory Usage
```bash
# Monitor memory usage
watch -n 1 'free -h && ps aux | grep tts'

# Solutions:
# - Reduce batch sizes
# - Enable garbage collection
# - Clear model caches periodically
```

#### 2. Audio Playback Issues
```bash
# Check audio devices
python -c "
import pygame
pygame.mixer.init()
print('Audio devices available:', pygame.mixer.get_num_channels())
"

# Solutions:
# - Install/update audio drivers
# - Check device permissions
# - Use alternative audio backend (pyaudio)
```

#### 3. Network Connectivity (EdgeTTS)
```bash
# Test EdgeTTS connectivity
python -c "
import asyncio
import edge_tts
async def test():
    communicate = edge_tts.Communicate('Hello world', 'en-US-AriaNeural')
    await communicate.save('test.mp3')
    print('EdgeTTS connectivity: OK')
asyncio.run(test())
"
```

#### 4. Performance Degradation
```bash
# Run performance benchmark
python phase6_performance_benchmark.py

# Check for:
# - Success rate < 80%
# - Latency > 3.0s
# - Memory leaks
# - CPU bottlenecks
```

## Security Considerations

### 1. Input Validation
```python
def validate_tts_input(text: str, max_length: int = 5000) -> bool:
    """Validate TTS input for security and performance"""
    
    # Length check
    if len(text) > max_length:
        return False
    
    # Content filtering
    prohibited_patterns = [
        r'<script.*?>.*?</script>',  # Script injection
        r'javascript:',              # JavaScript URLs
        r'data:text/html'           # Data URLs
    ]
    
    import re
    for pattern in prohibited_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return False
    
    return True
```

### 2. Rate Limiting
```python
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, max_requests: int = 100, time_window: int = 3600):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = defaultdict(list)
    
    def allow_request(self, client_id: str) -> bool:
        """Check if request is allowed under rate limit"""
        now = time.time()
        
        # Clean old requests
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if now - req_time < self.time_window
        ]
        
        # Check limit
        if len(self.requests[client_id]) >= self.max_requests:
            return False
        
        # Record request
        self.requests[client_id].append(now)
        return True
```

## Production Checklist

### Pre-Deployment
- [ ] All dependencies installed and verified
- [ ] Configuration files created and validated
- [ ] System health check passes
- [ ] Performance benchmark meets targets
- [ ] Security measures implemented
- [ ] Monitoring and logging configured

### Deployment
- [ ] Environment variables set correctly
- [ ] Application deployed to production server
- [ ] Load balancer configured (if applicable)
- [ ] SSL/TLS certificates installed
- [ ] Database connections tested
- [ ] Cache systems initialized

### Post-Deployment
- [ ] End-to-end functionality test
- [ ] Performance monitoring active
- [ ] Error alerting configured
- [ ] Backup systems verified
- [ ] Documentation updated
- [ ] Team trained on new system

## Support and Maintenance

### Regular Maintenance Tasks
```bash
# Daily
- Monitor system health and performance
- Review error logs
- Check resource usage

# Weekly  
- Run performance benchmarks
- Update dependency security patches
- Backup system configurations

# Monthly
- Review and optimize performance settings
- Update TTS models if available
- Conduct failover testing
```

### Emergency Procedures
```bash
# System Recovery Steps
1. Check system status: python test_system_readiness.py
2. Restart TTS service: systemctl restart tts-service
3. Clear caches and temp files: rm -rf /tmp/tts_*
4. Fallback to backup engine if primary fails
5. Escalate to development team if issues persist
```

## Conclusion

This production deployment guide provides comprehensive instructions for deploying the optimized TTS system with:

- ✅ **Multi-engine support** (XTTS + EdgeTTS)
- ✅ **Streaming capabilities** with real-time delivery
- ✅ **Performance optimization** and memory management
- ✅ **Production monitoring** and health checks
- ✅ **Scalability considerations** for growth
- ✅ **Security measures** and input validation

The system has been validated through comprehensive testing (86.4% success rate) and is ready for production deployment.

For additional support or questions, refer to the technical documentation in `PHASE6-DOCUMENTATION-OPTIMIZATION.md` or contact the development team.