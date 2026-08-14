export interface TimerEndpoint {
  x: number;
  y: number;
}

export interface RemainingRingGeometry {
  elapsedProgress: number;
  remainingProgress: number;
  dashLength: number;
  dashOffset: number;
}

export function getElapsedProgress(timeLeft: number, totalTime: number): number {
  if (totalTime <= 0) return 0;
  return Math.max(0, Math.min(1, (totalTime - timeLeft) / totalTime));
}

/** A full ring that is erased clockwise from 12 o'clock as time elapses. */
export function getRemainingRingGeometry(
  timeLeft: number,
  totalTime: number,
  circumference: number,
): RemainingRingGeometry {
  const elapsedProgress = getElapsedProgress(timeLeft, totalTime);
  const remainingProgress = 1 - elapsedProgress;

  return {
    elapsedProgress,
    remainingProgress,
    dashLength: circumference * remainingProgress,
    dashOffset: elapsedProgress === 0 ? 0 : -circumference * elapsedProgress,
  };
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
