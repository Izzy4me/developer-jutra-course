"""
Configuration management for TTS optimization.
Centralizes all performance settings and engine-specific configurations.
"""

from dataclasses import dataclass, field
from typing import Dict, Optional, Any
import os


@dataclass
class TTSConfig:
    """Configuration settings for TTS optimization"""
    
    # Performance settings
    xtts_max_workers: int = 1  # XTTS is not thread-safe
    edgetts_max_workers: int = 5  # EdgeTTS can handle more concurrent requests
    pyttsx3_max_workers: int = 2  # PyTTSX3 moderate concurrency
    
    # Text processing
    chunk_size: int = 500  # Maximum characters per chunk
    chunk_overlap: int = 50  # Overlap between chunks
    min_chunk_size: int = 50  # Minimum chunk size
    
    # Streaming settings
    enable_streaming: bool = True
    stream_buffer_size: int = 8192
    enable_chunked_synthesis: bool = True
    
    # Engine-specific optimizations
    xtts_cache_model: bool = True
    xtts_preload_components: bool = True
    enable_async_edgetts: bool = True
    edgetts_session_reuse: bool = True
    
    # Memory management
    max_memory_usage_mb: int = 8192 # 8GB limit
    cleanup_temp_files: bool = True
    enable_garbage_collection: bool = True
    
    # Audio quality settings
    default_sample_rate: int = 22050
    default_channels: int = 1  # Mono
    audio_format: str = "wav"
    
    # Performance monitoring
    enable_performance_monitoring: bool = True
    log_synthesis_metrics: bool = True
    export_performance_reports: bool = False
    
    # Fallback and error handling
    max_synthesis_retries: int = 3
    synthesis_timeout_seconds: int = 60
    enable_engine_fallback: bool = True
    
    # Debug settings
    debug_mode: bool = False
    verbose_logging: bool = False
    save_intermediate_files: bool = False
    
    # Feature flags for gradual rollout
    feature_flags: Dict[str, bool] = field(default_factory=lambda: {
        "streaming_synthesis": False,  # Disable by default until fully tested
        "parallel_chunking": True,
        "smart_text_preprocessing": True,
        "async_edgetts": True,
        "memory_optimization": True,
        "performance_monitoring": True,
    })


class ConfigManager:
    """Manages TTS configuration with environment variable support"""
    
    def __init__(self, config_file: Optional[str] = None):
        self._config = TTSConfig()
        self._config_file = config_file
        self._load_from_environment()
        
        if config_file and os.path.exists(config_file):
            self._load_from_file(config_file)
    
    def _load_from_environment(self):
        """Load configuration from environment variables"""
        env_mappings = {
            'TTS_XTTS_MAX_WORKERS': ('xtts_max_workers', int),
            'TTS_EDGETTS_MAX_WORKERS': ('edgetts_max_workers', int),
            'TTS_CHUNK_SIZE': ('chunk_size', int),
            'TTS_ENABLE_STREAMING': ('enable_streaming', self._str_to_bool),
            'TTS_ENABLE_ASYNC_EDGETTS': ('enable_async_edgetts', self._str_to_bool),
            'TTS_DEBUG_MODE': ('debug_mode', self._str_to_bool),
            'TTS_VERBOSE_LOGGING': ('verbose_logging', self._str_to_bool),
            'TTS_MAX_MEMORY_MB': ('max_memory_usage_mb', int),
            'TTS_SYNTHESIS_TIMEOUT': ('synthesis_timeout_seconds', int),
        }
        
        for env_var, (attr_name, converter) in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                try:
                    setattr(self._config, attr_name, converter(value))
                except (ValueError, TypeError) as e:
                    print(f"Warning: Invalid value for {env_var}: {value} ({e})")
    
    def _load_from_file(self, config_file: str):
        """Load configuration from JSON file"""
        try:
            import json
            with open(config_file, 'r') as f:
                config_data = json.load(f)
            
            for key, value in config_data.items():
                if hasattr(self._config, key):
                    setattr(self._config, key, value)
        except Exception as e:
            print(f"Warning: Could not load config from {config_file}: {e}")
    
    @staticmethod
    def _str_to_bool(value: str) -> bool:
        """Convert string to boolean"""
        return value.lower() in ('true', '1', 'yes', 'on', 'enabled')
    
    @property
    def config(self) -> TTSConfig:
        """Get current configuration"""
        return self._config
    
    def update_config(self, **kwargs):
        """Update configuration values"""
        for key, value in kwargs.items():
            if hasattr(self._config, key):
                setattr(self._config, key, value)
            else:
                print(f"Warning: Unknown config key: {key}")
    
    def enable_feature(self, feature_name: str, enabled: bool = True):
        """Enable or disable a feature flag"""
        self._config.feature_flags[feature_name] = enabled
    
    def is_feature_enabled(self, feature_name: str) -> bool:
        """Check if a feature flag is enabled"""
        return self._config.feature_flags.get(feature_name, False)
    
    def get_engine_max_workers(self, engine_name: str) -> int:
        """Get max workers for specific engine"""
        engine_workers = {
            'XTTS-v2': self._config.xtts_max_workers,
            'Microsoft Edge TTS': self._config.edgetts_max_workers,
            'pyttsx3': self._config.pyttsx3_max_workers,
        }
        return engine_workers.get(engine_name, 1)
    
    def export_config(self) -> Dict[str, Any]:
        """Export configuration as dictionary"""
        return {
            'performance': {
                'xtts_max_workers': self._config.xtts_max_workers,
                'edgetts_max_workers': self._config.edgetts_max_workers,
                'pyttsx3_max_workers': self._config.pyttsx3_max_workers,
            },
            'text_processing': {
                'chunk_size': self._config.chunk_size,
                'chunk_overlap': self._config.chunk_overlap,
                'min_chunk_size': self._config.min_chunk_size,
            },
            'streaming': {
                'enable_streaming': self._config.enable_streaming,
                'stream_buffer_size': self._config.stream_buffer_size,
                'enable_chunked_synthesis': self._config.enable_chunked_synthesis,
            },
            'memory': {
                'max_memory_usage_mb': self._config.max_memory_usage_mb,
                'cleanup_temp_files': self._config.cleanup_temp_files,
                'enable_garbage_collection': self._config.enable_garbage_collection,
            },
            'feature_flags': self._config.feature_flags.copy(),
            'debug': {
                'debug_mode': self._config.debug_mode,
                'verbose_logging': self._config.verbose_logging,
                'save_intermediate_files': self._config.save_intermediate_files,
            }
        }
    
    def save_config(self, config_file: str):
        """Save current configuration to file"""
        try:
            import json
            config_dict = self.export_config()
            
            os.makedirs(os.path.dirname(config_file), exist_ok=True)
            with open(config_file, 'w') as f:
                json.dump(config_dict, f, indent=2)
        except Exception as e:
            print(f"Error saving config to {config_file}: {e}")


# Global config manager instance
_config_manager: Optional[ConfigManager] = None

def get_config_manager() -> ConfigManager:
    """Get or create global config manager instance"""
    global _config_manager
    if _config_manager is None:
        # Try to load config from default location
        config_file = os.path.join(os.path.dirname(__file__), 'tts_config.json')
        _config_manager = ConfigManager(config_file if os.path.exists(config_file) else None)
    return _config_manager

def get_tts_config() -> TTSConfig:
    """Get current TTS configuration"""
    return get_config_manager().config
