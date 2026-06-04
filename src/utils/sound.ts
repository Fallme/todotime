// Sound system - create Audio on first user interaction

let players: (() => void)[] = [];
let ready = false;

function makeTone(freq: number, duration: number, vol: number = 0.3): string {
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
    const env = Math.min(t / 0.005, 1) * Math.exp(-t * 4) * vol;
    v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * freq * t) * env * 32767), true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

// Must be called on first user interaction (click/tap)
export function initAudio(): void {
  if (ready) return;
  ready = true;
  const urls = [
    makeTone(523, 0.15, 0.3), makeTone(659, 0.15, 0.25),
    makeTone(392, 0.4, 0.15), makeTone(523, 0.35, 0.12),
    makeTone(784, 0.12, 0.2), makeTone(1047, 0.18, 0.15),
  ];
  players = urls.map(url => {
    const a = new Audio(url);
    return () => { a.currentTime = 0; a.play().catch(() => {}); };
  });
}

function p(idx: number): void {
  if (ready && players[idx]) players[idx]();
}

// 进入专注 / 开始 / 继续 / 跳过休息 / 休息结束
export function playStart(): void { p(0); setTimeout(() => p(1), 120); }
// 进入休息
export function playEnterBreak(): void { p(2); setTimeout(() => p(3), 120); }
// 完成轮次
export function playCycleComplete(): void { p(0); setTimeout(() => p(1), 100); setTimeout(() => p(4), 200); setTimeout(() => p(5), 300); }
export function playWorkComplete(): void { playStart(); }
export function playBreakComplete(): void { playEnterBreak(); }
export function playTick(): void {}
