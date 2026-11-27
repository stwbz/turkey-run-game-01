// Sound: a small WebAudio synth, started on the first user gesture.
// Gobbles, chimes, thuds and a chase sting — no audio files, no network.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx || muted) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
  }
  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime + when);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime + when);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
    o.connect(g);
    g.connect(master);
    o.start(ctx.currentTime + when);
    o.stop(ctx.currentTime + when + dur + 0.05);
  }
  // The turkey's gobble: two quick descending clucks.
  function gobble() {
    tone(520, 0.09, 'square', 0.16, 0, 300);
    tone(480, 0.09, 'square', 0.16, 0.11, 280);
  }
  function chime() {
    tone(880, 0.16, 'sine', 0.22);
    tone(1318, 0.28, 'sine', 0.18, 0.08);
  }
  function featherChime() {
    tone(1046, 0.16, 'sine', 0.22);
    tone(1568, 0.3, 'sine', 0.2, 0.08);
    tone(2093, 0.34, 'sine', 0.14, 0.16);
  }
  function thud() {
    tone(70, 0.3, 'sine', 0.45);
  }
  function crashSound() {
    tone(55, 0.6, 'sawtooth', 0.35);
    tone(38, 0.8, 'square', 0.22, 0.05);
  }
  function sting() {
    // SPOTTED! — a short rising alarm.
    tone(220, 0.14, 'sawtooth', 0.25, 0, 440);
    tone(440, 0.14, 'sawtooth', 0.25, 0.14, 660);
    tone(660, 0.22, 'sawtooth', 0.25, 0.28, 880);
  }
  function fanfare() {
    tone(523, 0.18, 'sine', 0.25);
    tone(659, 0.18, 'sine', 0.25, 0.14);
    tone(784, 0.18, 'sine', 0.25, 0.28);
    tone(1046, 0.4, 'sine', 0.28, 0.42);
  }
  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.4;
  }
  return { ensure, gobble, chime, featherChime, thud, crashSound, sting, fanfare, setMuted, isMuted: () => muted };
}
