// Sound system using HTML5 Audio (more reliable than Web Audio API)

// Generate simple beep sounds as data URIs
function makeBeep(freq: number, duration: number, volume: number = 0.3): string {
  const sampleRate = 22050;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeStr = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples * 2, true);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 4) * volume;
    const val = Math.sin(2 * Math.PI * freq * t) * envelope;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, val * 32767)), true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

// Pre-generate sounds
const SOUNDS = {
  start: [makeBeep(523, 0.12, 0.3), makeBeep(659, 0.12, 0.25)],
  break: [makeBeep(392, 0.5, 0.15), makeBeep(523, 0.4, 0.12)],
  cycle: [makeBeep(523, 0.15, 0.25), makeBeep(659, 0.15, 0.25), makeBeep(784, 0.15, 0.25), makeBeep(1047, 0.2, 0.2)],
};

function playSequence(urls: string[], gap: number = 0.12): void {
  urls.forEach((url, i) => {
    setTimeout(() => {
      const audio = new Audio(url);
      audio.volume = 1;
      audio.play().catch(() => {});
    }, i * gap * 1000);
  });
}

export function initAudio(): void {
  // Play a silent audio to unlock autoplay
  const silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
  silent.volume = 0;
  silent.play().catch(() => {});
}

export function playStart(): void { playSequence(SOUNDS.start); }
export function playEnterBreak(): void { playSequence(SOUNDS.break); }
export function playCycleComplete(): void { playSequence(SOUNDS.cycle); }
export function playWorkComplete(): void { playStart(); }
export function playBreakComplete(): void { playEnterBreak(); }
export function playTick(): void { /* no tick sound */ }
