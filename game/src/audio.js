// All sound is synthesised with WebAudio: no audio files, no network.
// Every effect is a short oscillator/noise burst so the game stays silent
// until the player first interacts (browsers block audio before a gesture).
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.25;
    master.connect(context.destination);
    return context;
  }

  function tone(freq, dur, type, slideTo, volume, delay) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(volume || 0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, volume, lowpass, delay) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  return {
    unlock() { ensure(); if (context && context.state === 'suspended') context.resume(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    /** Two-note gobble: the turkey's happy peck sound. */
    gobble() { tone(520, 0.09, 'square', 380, 0.35); tone(660, 0.12, 'square', 440, 0.3, 0.09); },
    /** Corn pickup chirp, rising. */
    pickup() { tone(740, 0.08, 'sine', 990, 0.4); tone(990, 0.1, 'sine', 1320, 0.35, 0.07); },
    /** Farmer spots the turkey: a sharp two-note alarm. */
    spotted() { tone(220, 0.16, 'sawtooth', 220, 0.5); tone(330, 0.22, 'sawtooth', 330, 0.5, 0.14); },
    /** Knife whoosh as it flies past. */
    whoosh() { noise(0.18, 0.35, 2400); },
    /** A hit: thud plus a descending squawk. */
    hit() { noise(0.2, 0.6, 700); tone(420, 0.3, 'sawtooth', 140, 0.5); },
    /** Jump: a quick upward blip. */
    jump() { tone(300, 0.12, 'sine', 620, 0.3); },
    /** Dash: a short rush of air. */
    dash() { noise(0.16, 0.3, 1800); },
    /** Caught: low descending notes. */
    caught() { tone(196, 0.3, 'triangle', 180, 0.55); tone(147, 0.4, 'triangle', 110, 0.55, 0.28); tone(98, 0.6, 'triangle', 65, 0.55, 0.55); },
    /** Escaped: a little Thanksgiving fanfare. */
    escaped() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => tone(freq, 0.22, 'triangle', freq, 0.5, i * 0.14));
      tone(1319, 0.5, 'triangle', 1319, 0.45, 0.6);
    },
    /** Oven sizzle loop tick while standing near heat. */
    sizzle() { noise(0.12, 0.2, 3200); },
  };
}
