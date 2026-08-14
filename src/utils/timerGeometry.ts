export interface TimerEndpoint {
  x: number;
  y: number;
}

/** Returns the clockwise end point of a progress ring whose origin is at 12 o'clock. */
export function getTimerEndpoint(progress: number, radius: number, center: number): TimerEndpoint {
  const safeProgress = Math.max(0, Math.min(1, progress));
  const angle = safeProgress * Math.PI * 2 - Math.PI / 2;

  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}
