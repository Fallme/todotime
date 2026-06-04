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

  // 专注 - 清澈明亮的上行音 C5→E5→G5，带泛音
  const focus1 = makeTone(523, 0.12, 0.25);
  const focus2 = makeTone(659, 0.12, 0.22);
  const focus3 = makeTone(784, 0.18, 0.18);

  // 休息 - 柔和下行和弦 G4+C5，温暖三角波
  const break1 = makeChord([392, 523], 0.5, 0.15);

  // 轮次完成 - C-E-G-C 上行琶音
  const cycle1 = makeTone(523, 0.1, 0.2);
  const cycle2 = makeTone(659, 0.1, 0.2);
  const cycle3 = makeTone(784, 0.1, 0.2);
  const cycle4 = makeTone(1047, 0.2, 0.15);

  const mk = (url: string) => { const a = new Audio(url); return () => { a.currentTime = 0; a.play().catch(() => {}); }; };

  // players[0-2] = focus, [3] = break, [4-7] = cycle
  players = [mk(focus1), mk(focus2), mk(focus3), mk(break1), mk(cycle1), mk(cycle2), mk(cycle3), mk(cycle4)];
}

function p(i: number): void { if (ready && players[i]) players[i](); }

export function playStart(): void { p(0); setTimeout(() => p(1), 100); setTimeout(() => p(2), 200); }
export function playEnterBreak(): void { p(3); }
export function playCycleComplete(): void { p(4); setTimeout(() => p(5), 90); setTimeout(() => p(6), 180); setTimeout(() => p(7), 270); }
export function playWorkComplete(): void { playStart(); }
export function playBreakComplete(): void { playEnterBreak(); }
export function playTick(): void {}
