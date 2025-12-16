// Audio utilities wrapper. Re-export audio helpers from the global scope to maintain behavior.
function missingWarn(name) {
  return function() { console.warn(name + ' is not available on window.'); };
}

export const audioCtx = (typeof window !== 'undefined' && window.audioCtx) ? window.audioCtx : null;

export const playBonkSound = (typeof window !== 'undefined' && window.playBonkSound) ? window.playBonkSound : missingWarn('playBonkSound');
export const playCurbSound = (typeof window !== 'undefined' && window.playCurbSound) ? window.playCurbSound : missingWarn('playCurbSound');
export const startDriftSound = (typeof window !== 'undefined' && window.startDriftSound) ? window.startDriftSound : missingWarn('startDriftSound');
export const updateDriftSound = (typeof window !== 'undefined' && window.updateDriftSound) ? window.updateDriftSound : missingWarn('updateDriftSound');
export const stopDriftSound = (typeof window !== 'undefined' && window.stopDriftSound) ? window.stopDriftSound : missingWarn('stopDriftSound');
export const startEngineRevSound = (typeof window !== 'undefined' && window.startEngineRevSound) ? window.startEngineRevSound : missingWarn('startEngineRevSound');
export const updateEngineRevSound = (typeof window !== 'undefined' && window.updateEngineRevSound) ? window.updateEngineRevSound : missingWarn('updateEngineRevSound');
export const stopEngineRevSound = (typeof window !== 'undefined' && window.stopEngineRevSound) ? window.stopEngineRevSound : missingWarn('stopEngineRevSound');
export const playLevelCompleteSound = (typeof window !== 'undefined' && window.playLevelCompleteSound) ? window.playLevelCompleteSound : missingWarn('playLevelCompleteSound');

export default {
  audioCtx,
  playBonkSound,
  playCurbSound,
  startDriftSound,
  updateDriftSound,
  stopDriftSound,
  startEngineRevSound,
  updateEngineRevSound,
  stopEngineRevSound,
  playLevelCompleteSound,
};
