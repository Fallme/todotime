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

export function calculateManualPomodoroCount(durationMinutes: number, roundMinutes: number): number {
  const duration = Math.max(0, Math.floor(Number(durationMinutes) || 0));
  const round = Math.max(1, Math.floor(Number(roundMinutes) || 0));
  const fullRounds = Math.floor(duration / round);
  const remainder = duration % round;
  return fullRounds + (remainder >= MIN_POMODORO_MINUTES ? 1 : 0);
}

export function getPomodoroCount(record: PomodoroRecord): number {
  if (Number.isFinite(record.pomodoroCount)) {
    return Math.max(0, Math.floor(Number(record.pomodoroCount)));
  }
  if (typeof record.countsAsPomodoro === 'boolean') return record.countsAsPomodoro ? 1 : 0;
  return countsAsPomodoro(record.duration) ? 1 : 0;
}

export function sumPomodoroCounts(records: PomodoroRecord[]): number {
  return records.reduce((sum, record) => sum + getPomodoroCount(record), 0);
}

export function isPomodoroRecord(record: PomodoroRecord): boolean {
  return getPomodoroCount(record) > 0;
}

export function getNextCycle(currentCycle: number, cycleInterval: number): { nextCycle: number; startsLongBreak: boolean } {
  const safeInterval = Math.max(1, Math.floor(cycleInterval));
  const next = Math.max(0, Math.floor(currentCycle)) + 1;
  return next >= safeInterval
    ? { nextCycle: safeInterval, startsLongBreak: true }
    : { nextCycle: next, startsLongBreak: false };
}
