import type { PomodoroRecord } from '../types';

export const MIN_FOCUS_RECORD_MINUTES = 1;
export const MIN_POMODORO_MINUTES = 15;

export function completedMinutes(elapsedSeconds: number): number {
  return Math.max(0, Math.floor(elapsedSeconds / 60));
}

export function shouldRecordFocus(elapsedSeconds: number): boolean {
  return elapsedSeconds >= MIN_FOCUS_RECORD_MINUTES * 60;
}

export function countsAsPomodoro(durationMinutes: number): boolean {
  return durationMinutes >= MIN_POMODORO_MINUTES;
}

export function isPomodoroRecord(record: PomodoroRecord): boolean {
  return record.countsAsPomodoro ?? countsAsPomodoro(record.duration);
}

export function getNextCycle(currentCycle: number, cycleInterval: number): { nextCycle: number; startsLongBreak: boolean } {
  const safeInterval = Math.max(1, Math.floor(cycleInterval));
  const next = Math.max(0, Math.floor(currentCycle)) + 1;
  return next >= safeInterval
    ? { nextCycle: safeInterval, startsLongBreak: true }
    : { nextCycle: next, startsLongBreak: false };
}
