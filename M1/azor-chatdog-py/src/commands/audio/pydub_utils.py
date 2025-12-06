"""
Utility module for shared pydub imports and variables.
Ensures pydub is loaded once and shared across the application.
"""

HAVE_PYDUB = False
AudioSegment = None
pydub_play = None

try:
    from pydub import AudioSegment
    from pydub.playback import play as pydub_play
    HAVE_PYDUB = True
except Exception:
    pass
