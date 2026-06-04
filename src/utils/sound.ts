// Sound system - always creates fresh AudioContext to avoid suspension issues
const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

let savedCtx: AudioContext | null = null;

// Unlock on first user interaction
export function initAudio(): void {
  try {
    const ctx = new AudioCtx();
    // Play silent buffer to unlock
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    savedCtx = ctx;
  } catch { /* ignore */ }
}

function getCtx(): AudioContext | null {
  if (savedCtx && savedCtx.state === 'running') return savedCtx;
  if (savedCtx && savedCtx.state === 'suspended') {
    savedCtx.resume();
    return savedCtx;
  }
  // Try to create new context
  try {
    savedCtx = new AudioCtx();
    if (savedCtx.state === 'suspended') savedCtx.resume();
    return savedCtx;
  } catch { return null; }
}

function playTone(freq: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration);
}

// 进入专注 / 开始 / 继续
export function playStart(): void {
  playTone(523, 0, 0.15, 0.3);
  playTone(659, 0.1, 0.15, 0.25);
}

// 进入休息 - 柔和双音
export function playEnterBreak(): void {
  playTone(392, 0, 0.6, 0.15);
  playTone(523, 0.12, 0.5, 0.12);
}

// 完成轮次 - 庆祝
export function playCycleComplete(): void {
  playTone(523, 0, 0.2, 0.25);
  playTone(659, 0.12, 0.2, 0.25);
  playTone(784, 0.24, 0.2, 0.25);
  playTone(1047, 0.36, 0.3, 0.2);
}

export function playWorkComplete(): void { playStart(); }
export function playBreakComplete(): void { playEnterBreak(); }
export function playTick(): void { playTone(600, 0, 0.05, 0.1); }
