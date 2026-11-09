// audio.js — Sound effects, background music, crowd with Web Audio API

let audioCtx = null;
let muted = false;
let bgMusicPlaying = false;
let bgGain = null;
let bgInterval = null;
let startSound = null;
let girisSound = null;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function ensureAudio() {
    if (muted) return false;
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return true;
}

function toggleMute() {
    muted = !muted;
    if (muted) stopBgMusic();
    return muted;
}

// Synthesize a sound
function playTone(freq, duration, type, vol, ramp) {
    if (!ensureAudio()) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (ramp) osc.frequency.exponentialRampToValueAtTime(ramp, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(vol || 0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const noiseBufferCache = {};
function getNoiseBuffer(duration) {
    const key = duration.toFixed(2);
    if (noiseBufferCache[key]) return noiseBufferCache[key];
    const bufSize = Math.floor(audioCtx.sampleRate * duration);
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    noiseBufferCache[key] = buf;
    return buf;
}

function playNoise(duration, vol) {
    if (!ensureAudio()) return;
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    src.buffer = getNoiseBuffer(duration);
    gain.gain.setValueAtTime(vol || 0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
}

// ---- BACKGROUND MUSIC (lo-fi beat) ----

function startBgMusic() {
    if (muted || bgMusicPlaying || !audioCtx) return;
    bgMusicPlaying = true;

    bgGain = audioCtx.createGain();
    bgGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    bgGain.connect(audioCtx.destination);

    // Chord progression: Am - F - C - G
    const chords = [
        [220, 261, 329],   // Am
        [174, 220, 261],   // F
        [261, 329, 392],   // C
        [196, 246, 293]    // G
    ];
    let chordIdx = 0;
    let beatCount = 0;

    function playBeat() {
        if (!bgMusicPlaying || !audioCtx) return;
        const t = audioCtx.currentTime;
        const chord = chords[chordIdx];

        // Soft pad chord
        if (beatCount % 8 === 0) {
            chord.forEach(freq => {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                g.gain.setValueAtTime(0.04, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
                osc.connect(g);
                g.connect(bgGain);
                osc.start(t);
                osc.stop(t + 2);
            });
        }

        // Kick (every 2 beats)
        if (beatCount % 2 === 0) {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
            g.gain.setValueAtTime(0.12, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.connect(g);
            g.connect(bgGain);
            osc.start(t);
            osc.stop(t + 0.15);
        }

        // Hi-hat (every beat, soft)
        const nBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.03, audioCtx.sampleRate);
        const nData = nBuf.getChannelData(0);
        for (let i = 0; i < nData.length; i++) nData[i] = (Math.random() * 2 - 1);
        const nSrc = audioCtx.createBufferSource();
        const nG = audioCtx.createGain();
        nSrc.buffer = nBuf;
        nG.gain.setValueAtTime(0.02, t);
        nG.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        nSrc.connect(nG);
        nG.connect(bgGain);
        nSrc.start(t);

        beatCount++;
        if (beatCount % 8 === 0) chordIdx = (chordIdx + 1) % chords.length;
    }

    bgInterval = setInterval(playBeat, 280);
    playBeat();
}

function stopBgMusic() {
    bgMusicPlaying = false;
    if (bgInterval) { clearInterval(bgInterval); bgInterval = null; }
    if (bgGain) {
        try {
            bgGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            setTimeout(() => { try { bgGain.disconnect(); } catch(e) {} bgGain = null; }, 600);
        } catch(e) { bgGain = null; }
    }
}

// ---- CROWD CHEER ----
function sndCrowd() {
    if (!ensureAudio()) return;
    // Layered noise bursts simulating crowd
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const dur = 0.4 + Math.random() * 0.3;
            const bufSize = Math.floor(audioCtx.sampleRate * dur);
            const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
            const data = buf.getChannelData(0);
            for (let j = 0; j < bufSize; j++) {
                const env = Math.sin(j / bufSize * Math.PI);
                data[j] = (Math.random() * 2 - 1) * 0.3 * env;
            }
            const src = audioCtx.createBufferSource();
            const g = audioCtx.createGain();
            const filt = audioCtx.createBiquadFilter();
            filt.type = 'bandpass';
            filt.frequency.setValueAtTime(800 + Math.random() * 1200, audioCtx.currentTime);
            filt.Q.setValueAtTime(0.5, audioCtx.currentTime);
            src.buffer = buf;
            g.gain.setValueAtTime(0.08, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
            src.connect(filt);
            filt.connect(g);
            g.connect(audioCtx.destination);
            src.start();
        }, i * 80);
    }
    // High pitched "woo"
    playTone(600, 0.2, 'sine', 0.06, 900);
    setTimeout(() => playTone(700, 0.15, 'sine', 0.05, 500), 100);
}

// ---- GAME SOUNDS ----

function sndSwoosh() {
    playNoise(0.25, 0.2);
    playTone(800, 0.15, 'sine', 0.2, 1200);
    setTimeout(() => playTone(1200, 0.1, 'sine', 0.15, 1600), 80);
    sndCrowd();
}

function sndClank() {
    playTone(300, 0.15, 'square', 0.15, 100);
    playTone(600, 0.08, 'triangle', 0.1, 200);
}

function sndBounce() {
    playTone(200, 0.1, 'sine', 0.12, 80);
}

function sndWhistle() {
    playTone(900, 0.15, 'sine', 0.25);
    setTimeout(() => playTone(1100, 0.3, 'sine', 0.25), 160);
}

function sndPowerup() {
    playTone(500, 0.08, 'sine', 0.2, 800);
    setTimeout(() => playTone(700, 0.08, 'sine', 0.2, 1100), 80);
    setTimeout(() => playTone(900, 0.12, 'sine', 0.2, 1400), 160);
}

function sndCountdown() {
    playTone(600, 0.12, 'square', 0.15);
}

function sndCountdownGo() {
    playTone(800, 0.08, 'square', 0.2);
    setTimeout(() => playTone(1000, 0.08, 'square', 0.2), 60);
    setTimeout(() => playTone(1200, 0.2, 'square', 0.25), 120);
}

function sndCombo() {
    playTone(600, 0.1, 'sine', 0.2, 900);
    setTimeout(() => playTone(900, 0.1, 'sine', 0.2, 1300), 100);
    setTimeout(() => playTone(1300, 0.15, 'sine', 0.2, 1800), 200);
    sndCrowd();
}

function sndStart() {
    if (muted) return;
    if (!startSound) {
        startSound = new Audio('sound/start.mp3');
    }
    startSound.currentTime = 0;
    startSound.play().catch(() => {});
}

function stopStartSound() {
    if (startSound) {
        startSound.pause();
        startSound.currentTime = 0;
    }
}

function sndGiris() {
    if (muted) return;
    if (!girisSound) {
        girisSound = new Audio('sound/giris.mp3');
    }
    girisSound.currentTime = 0;
    girisSound.play().catch(() => {});
}

function stopGirisSound() {
    if (girisSound) {
        girisSound.pause();
        girisSound.currentTime = 0;
    }
}
