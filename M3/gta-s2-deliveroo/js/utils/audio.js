const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export function getAudioContext() {
    return audioCtx;
}

export function playBonkSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
}

export function playCurbSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

let driftOscillator = null;
let driftGain = null;

export function startDriftSound(intensity = 1.0) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (driftOscillator) return;
    driftOscillator = audioCtx.createOscillator();
    driftGain = audioCtx.createGain();
    driftOscillator.type = 'sawtooth';
    driftOscillator.frequency.setValueAtTime(180 + intensity * 100, audioCtx.currentTime);
    driftGain.gain.setValueAtTime(0, audioCtx.currentTime);
    driftGain.gain.linearRampToValueAtTime(0.15 * intensity, audioCtx.currentTime + 0.05);
    driftOscillator.connect(driftGain);
    driftGain.connect(audioCtx.destination);
    driftOscillator.start();
}

export function updateDriftSound(intensity = 1.0) {
    if (!driftOscillator || !driftGain) return;
    const now = audioCtx.currentTime;
    driftOscillator.frequency.setValueAtTime(180 + intensity * 100, now);
    driftGain.gain.setValueAtTime(0.15 * intensity, now);
}

export function stopDriftSound() {
    if (!driftOscillator || !driftGain) return;
    const now = audioCtx.currentTime;
    driftGain.gain.linearRampToValueAtTime(0.01, now + 0.1);
    setTimeout(() => {
        if (driftOscillator) {
            try { driftOscillator.stop(); } catch (e) {}
            driftOscillator.disconnect();
            driftGain.disconnect();
        }
        driftOscillator = null;
        driftGain = null;
    }, 150);
}

let engineRevOscillator = null;
let engineRevGain = null;

export function startEngineRevSound(revLevel = 0.5) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (engineRevOscillator) return;
    engineRevOscillator = audioCtx.createOscillator();
    engineRevGain = audioCtx.createGain();
    engineRevOscillator.type = 'sawtooth';
    engineRevOscillator.frequency.setValueAtTime(80 + revLevel * 120, audioCtx.currentTime);
    engineRevGain.gain.setValueAtTime(0, audioCtx.currentTime);
    engineRevGain.gain.linearRampToValueAtTime(0.12 * revLevel, audioCtx.currentTime + 0.05);
    engineRevOscillator.connect(engineRevGain);
    engineRevGain.connect(audioCtx.destination);
    engineRevOscillator.start();
}

export function updateEngineRevSound(revLevel = 0.5) {
    if (!engineRevOscillator || !engineRevGain) return;
    const now = audioCtx.currentTime;
    engineRevOscillator.frequency.setValueAtTime(80 + revLevel * 120, now);
    engineRevGain.gain.setValueAtTime(0.12 * revLevel, now);
}

export function stopEngineRevSound() {
    if (!engineRevOscillator || !engineRevGain) return;
    const now = audioCtx.currentTime;
    engineRevGain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    setTimeout(() => {
        if (engineRevOscillator) {
            try { engineRevOscillator.stop(); } catch (e) {}
            engineRevOscillator.disconnect();
            engineRevGain.disconnect();
        }
        engineRevOscillator = null;
        engineRevGain = null;
    }, 200);
}

export function playLevelCompleteSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.connect(audioCtx.destination);
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
        osc.connect(gain);
        osc.start(audioCtx.currentTime + i * 0.1);
        osc.stop(audioCtx.currentTime + i * 0.1 + 0.1);
    });
}

export { audioCtx };
