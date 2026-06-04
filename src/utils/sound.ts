// Sound system using HTML5 Audio + clean WAV generation

function makeTone(freq: number, duration: number, volume: number = 0.3): string {
  const sampleRate = 44100;
  const samples = Math.floor(sampleRate * duration);
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);

  // WAV header
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + samples * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, 'data'); v.setUint32(40, samples * 2, true);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    // Smooth ADSR envelope
    const attack = Math.min(t / 0.01, 1);
    const decay = Math.exp(-t * 3);
    const env = attack * decay * volume;
    v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * freq * t) * env * 32767), true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

// Pre-generate sounds
const S = {
  start: [makeTone(523, 0.15, 0.25), makeTone(659, 0.15, 0.2)],
  break: [makeTone(392, 0.4, 0.12), makeTone(523, 0.35, 0.1)],
  cycle: [makeTone(523, 0.12, 0.2), makeTone(659, 0.12, 0.2), makeTone(784, 0.12, 0.2), makeTone(1047, 0.18, 0.15)],
};

let currentAudio: HTMLAudioElement | null = null;

function play(urls: string[], gap = 0.15): void {
  // Stop any currently playing sound
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  const a = new Audio(urls[0]);
  currentAudio = a;
  a.volume = 1;
  a.play().catch(() => {});
  urls.slice(1).forEach((url, i) => {
    setTimeout(() => {
      const na = new Audio(url);
      currentAudio = na;
      na.volume = 1;
      na.play().catch(() => {});
    }, (i + 1) * gap * 1000);
  });
}

export function initAudio(): void {
  try {
    const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    a.volume = 0; a.play().catch(() => {});
  } catch { /* ignore */ }
}

export function playStart(): void { play(S.start); }
export function playEnterBreak(): void { play(S.break); }
export function playCycleComplete(): void { play(S.cycle); }
export function playWorkComplete(): void { playStart(); }
export function playBreakComplete(): void { playEnterBreak(); }
export function playTick(): void { /* no tick */ }
