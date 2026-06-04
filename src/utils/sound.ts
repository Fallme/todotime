// Sound system using pre-created HTML5 Audio elements

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

// Pre-create Audio elements (reuse, don't recreate)
function makePlayer(url: string): () => void {
  let a: HTMLAudioElement | null = null;
  return () => {
    if (!a) a = new Audio(url);
    a.currentTime = 0;
    a.play().catch(() => {});
  };
}

const play1 = makePlayer(makeTone(523, 0.15, 0.3));
const play2 = makePlayer(makeTone(659, 0.15, 0.25));
const play3 = makePlayer(makeTone(392, 0.4, 0.15));
const play4 = makePlayer(makeTone(523, 0.35, 0.12));
const play5 = makePlayer(makeTone(784, 0.12, 0.2));
const play6 = makePlayer(makeTone(1047, 0.18, 0.15));

export function initAudio(): void {
  try {
    const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    a.volume = 0; a.play().catch(() => {});
  } catch { /* ignore */ }
}

// 进入专注 / 开始 / 继续
export function playStart(): void { play1(); setTimeout(play2, 120); }
// 进入休息
export function playEnterBreak(): void { play3(); setTimeout(play4, 120); }
// 完成轮次
export function playCycleComplete(): void { play1(); setTimeout(play2, 100); setTimeout(play5, 200); setTimeout(play6, 300); }
export function playWorkComplete(): void { playStart(); }
export function playBreakComplete(): void { playEnterBreak(); }
export function playTick(): void { /* no tick */ }
