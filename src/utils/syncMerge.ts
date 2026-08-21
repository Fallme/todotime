import type { DayData, PomodoroRecord } from '../types';
import { getPomodoroCount, sumPomodoroCounts } from './pomodoroRules.ts';

export function pomodoroRecordKey(record: PomodoroRecord): string {
  return record.id || [record.start, record.end, record.taskId ?? '', record.createdAt].join('|');
}

export function pomodoroCounterRecordIds(record: PomodoroRecord): string[] {
  const baseId = pomodoroRecordKey(record);
  const count = getPomodoroCount(record);
  if (count <= 0) return [];
  if (count === 1) return [baseId];
  return Array.from({ length: count }, (_, index) => `${baseId}#${index + 1}`);
}

export function mergePomodoroRecords(localRecords: PomodoroRecord[], remoteRecords: PomodoroRecord[]): PomodoroRecord[] {
  const records = new Map<string, PomodoroRecord>();
  for (const record of [...remoteRecords, ...localRecords]) records.set(pomodoroRecordKey(record), record);
  return [...records.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function mergeDayData(local: DayData | undefined, remote: DayData | undefined, date: string): DayData | undefined {
  if (!local && !remote) return undefined;
  const pomodoros = mergePomodoroRecords(local?.pomodoros ?? [], remote?.pomodoros ?? []);
  return {
    ...(remote ?? local),
    date,
    pomodoros,
    tasks: (remote?.tasks?.length ? remote.tasks : local?.tasks) ?? [],
    totalFocusMinutes: pomodoros.reduce((sum, record) => sum + record.duration, 0),
    totalPomodoros: sumPomodoroCounts(pomodoros),
    totalTasksCompleted: Math.max(local?.totalTasksCompleted ?? 0, remote?.totalTasksCompleted ?? 0),
    streak: Math.max(local?.streak ?? 0, remote?.streak ?? 0),
  } as DayData;
}

export function mergeDayDataMaps(local: Map<string, DayData>, remote: Map<string, DayData>): Map<string, DayData> {
  const merged = new Map<string, DayData>();
  const dates = new Set([...local.keys(), ...remote.keys()]);
  for (const date of dates) {
    const day = mergeDayData(local.get(date), remote.get(date), date);
    if (day) merged.set(date, day);
  }
  return merged;
}

export function samePomodoroRecords(left: PomodoroRecord[], right: PomodoroRecord[]): boolean {
  if (left.length !== right.length) return false;
  const rightRecords = new Map(right.map(record => [pomodoroRecordKey(record), record]));
  return left.every(record => {
    const other = rightRecords.get(pomodoroRecordKey(record));
    const serialize = (item: PomodoroRecord) => JSON.stringify(
      Object.entries(item).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)),
    );
    return other !== undefined && serialize(record) === serialize(other);
  });
}
