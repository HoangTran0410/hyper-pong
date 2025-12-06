// Zzfx - Zuper Zmall Zound Zynth - Micro Edition
// MIT License - Copyright 2019 Frank Force

let zzfxV = 0.3; // Volume

export const setVolume = (vol: number) => {
  zzfxV = vol;
};

// We use a simplified version for this project to ensure it runs without external deps
export const zzfx = (...parameters: (number | undefined)[]) => {
  try {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return;
    const x = new C();
    
    // Default parameters if not provided
    const [
        volume = 1, random = 0.05, frequency = 220, attack = 0.05, sustain = 0.2,
        release = 0.1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
        pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0,
        bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0.1, tremolo = 0
    ] = parameters;

    // Generate sound
    const sampleRate = 44100;
    const startSlide = slide * 500 * Math.PI / sampleRate ** 2;
    const modPhase = modulation * Math.PI * 2 / sampleRate;
    const decayTime = decay * sampleRate;
    const attackTime = attack * sampleRate;
    const sustainTime = sustain * sampleRate;
    const releaseTime = release * sampleRate;
    const totalTime = attackTime + sustainTime + decayTime + releaseTime;
    const buffer = x.createBuffer(1, totalTime | 0, sampleRate);
    const data = buffer.getChannelData(0);

    let f = frequency * Math.PI * 2 / sampleRate;
    let v = 0;
    let p = 0;
    let tm = 0;
    let s = 0; // Current frequency slide

    for (let i = 0; i < totalTime; ++i) {
        // Envelopes
        if (i < attackTime) {
           v = i / attackTime;
        } else if (i < attackTime + sustainTime) {
           v = 1 - (1 - sustainVolume) * (i - attackTime) / sustainTime;
        } else { // Release
           v = sustainVolume * (1 - (i - attackTime - sustainTime) / releaseTime);
           if (i > totalTime) v = 0;
        }
        
        // Oscillator
        p += f;
        f += s + startSlide + deltaSlide * i / sampleRate ** 3;
        
        // Shape
        let t = shape === 0 ? Math.sin(p) : 
                shape === 1 ? (p % (2 * Math.PI) < Math.PI ? 1 : -1) : // Square
                shape === 2 ? 1 - 4 * Math.abs(Math.round(p / (2 * Math.PI)) - p / (2 * Math.PI)) : // Triangle
                Math.random() * 2 - 1; // Noise
                
        // Noise
        if (noise) t += Math.random() * noise * 2 - noise;

        data[i] = t * v * volume * zzfxV;
    }

    const source = x.createBufferSource();
    source.buffer = buffer;
    source.connect(x.destination);
    source.start();
    return source;
  } catch (e) {
    console.error('Audio error', e);
  }
};

// Sound Presets
export const sounds = {
  paddleHit: () => zzfx(1, .05, 386, .02, .06, .1, 1, 1.6, -9.1, .3, 0, 0, 0, 0, 0, 0, .04),
  wallHit: () => zzfx(1, .05, 537, .02, .02, .1, 1, 1.6, -9.1, .3, 0, 0, 0, 0, 0, 0, .04),
  score: () => zzfx(1, .05, 239, .07, .37, .4, 1, 2.9, 1.4, 0, 0, 0, 0, 0, 0, 0, 0, .69, .06),
  powerUpSpawn: () => zzfx(1, .05, 1200, .05, .1, .2, 2, 0, 0, 0, 0, 0, .1, .5),
  powerUpCollect: () => zzfx(1, .05, 600, .05, .2, .3, 3, 2, 5, 0, 0, 0, 0, 0, .5, 0, 0),
  gameOver: () => zzfx(1, .05, 140, .3, .6, .8, 1, .6, -6, 0, 0, 0, 0, 0, 0, .5, .2),
  shieldHit: () => zzfx(1, .05, 150, .05, .2, .3, 4, 1, 0, 0, 0, 0, 0, .8, 0, 0, .1),
};
