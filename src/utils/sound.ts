// Sound system - pleasant tones created on first interaction

let players: (() => void)[] = [];
let ready = false;

function makeTone(freq: number, duration: number, vol: number = 0.3, type: OscillatorType = 'sine'): string {
  const sr = 44100, n = Math.floor(sr * duration);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const attack = Math.min(t / 0.015, 1);
    const release = Math.min((duration - t) / 0.05, 1);
    const env = attack * release * vol;
    let sample = 0;
    if (type === 'sine') {
      sample = Math.sin(2 * Math.PI * freq * t);
    } else if (type === 'triangle') {
      sample = 2 * Math.abs(2 * (t * freq % 1) - 1) - 1;
    }
    // Add soft harmonics for richness
    sample += 0.3 * Math.sin(2 * Math.PI * freq * 2 * t);
    sample += 0.1 * Math.sin(2 * Math.PI * freq * 3 * t);
    v.setInt16(44 + i * 2, Math.round(sample * env * 0.5 * 32767), true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function makeChord(freqs: number[], duration: number, vol: number = 0.2): string {
  const sr = 44100, n = Math.floor(sr * duration);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, 'data'); v.setUint32(40, n * 2, true);
  const volPerNote = vol / freqs.length;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const attack = Math.min(t / 0.02, 1);
    const release = Math.min((duration - t) / 0.08, 1);
    const env = attack * release;
    let sample = 0;
    freqs.forEach(f => {
      sample += Math.sin(2 * Math.PI * f * t);
      sample += 0.15 * Math.sin(2 * Math.PI * f * 2 * t);
    });
    v.setInt16(44 + i * 2, Math.round(sample * env * volPerNote * 32767), true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export function initAudio(): void {
  if (ready) return;
  ready = true;

  // Start: a short, bright two-note "ready, focus" cue.
  const focus1 = makeTone(523, 0.14, 0.22);
  const focus2 = makeTone(784, 0.24, 0.17);

  // Break: a slower descending phrase that clearly contrasts with the start cue.
  const break1 = makeTone(659, 0.18, 0.14, 'triangle');
  const break2 = makeTone(523, 0.20, 0.13, 'triangle');
  const break3 = makeChord([392, 523], 0.38, 0.12);

  // 轮次完成 - C-E-G-C 上行琶音
  const cycle1 = makeTone(523, 0.1, 0.2);
  const cycle2 = makeTone(659, 0.1, 0.2);
  const cycle3 = makeTone(784, 0.1, 0.2);
  const cycle4 = makeTone(1047, 0.2, 0.15);

  const mk = (url: string) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    return () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };
  };

  players = [
    mk(focus1), mk(focus2),
    mk(break1), mk(break2), mk(break3),
    mk(cycle1), mk(cycle2), mk(cycle3), mk(cycle4),
  ];
}

function p(i: number): void { if (ready && players[i]) players[i](); }

export function playStart(): void { p(0); setTimeout(() => p(1), 130); }
export function playEnterBreak(): void { p(2); setTimeout(() => p(3), 160); setTimeout(() => p(4), 330); }
export function playCycleComplete(): void { p(5); setTimeout(() => p(6), 90); setTimeout(() => p(7), 180); setTimeout(() => p(8), 270); }
export function playWorkComplete(): void { playStart(); }
export function playBreakComplete(): void { playEnterBreak(); }
export function playTick(): void {}
