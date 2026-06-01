import { useState, useCallback, useEffect, useRef } from 'react';
import type { DayData, PomodoroRecord, Todo } from '../types';
import { saveDayData, loadMultipleDays } from '../services/github';
import { formatDate } from '../utils/dateUtils';

interface UseGithubSyncReturn {
  dayDataMap: Map<string, DayData>;
  setDayDataMap: React.Dispatch<React.SetStateAction<Map<string, DayData>>>;
  syncing: boolean;
  syncError: string | null;
  syncDayData: (date: string, pomodoros: PomodoroRecord[], tasks: Todo[]) => Promise<void>;
  loadWeekData: () => Promise<void>;
}

export function useGithubSync(repo: string, token: string): UseGithubSyncReturn {
  const [dayDataMap, setDayDataMap] = useState<Map<string, DayData>>(new Map());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const loadWeekData = useCallback(async () => {
    if (!token || !repo) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const dates: string[] = [];
      const now = new Date();
      for (let i = 30; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(formatDate(d));
      }
      const data = await loadMultipleDays(repo, token, dates);
      setDayDataMap(prev => {
        const merged = new Map(prev);
        data.forEach((v, k) => merged.set(k, v));
        return merged;
      });
    } catch (e) {
      setSyncError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [repo, token]);

  const syncDayData = useCallback(async (
    date: string,
    pomodoros: PomodoroRecord[],
    tasks: Todo[],
  ) => {
    if (!token || !repo) return;

    const existing = dayDataMap.get(date);
    const allPomodoros = existing
      ? [...existing.pomodoros, ...pomodoros.slice(existing.pomodoros.length)]
      : pomodoros;
    const totalFocusMinutes = allPomodoros.reduce((s, p) => s + p.duration, 0);
    const completedTasks = tasks.filter(t => t.done).length;

    const dayData: DayData = {
      date,
      pomodoros: allPomodoros,
      tasks,
      totalFocusMinutes,
      totalPomodoros: allPomodoros.length,
      totalTasksCompleted: completedTasks,
      streak: existing?.streak || 0,
    };

    setDayDataMap(prev => new Map(prev).set(date, dayData));

    // queue the GitHub commit
    queueRef.current = queueRef.current.then(async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        await saveDayData(repo, token, dayData);
      } catch (e) {
        setSyncError((e as Error).message);
      } finally {
        setSyncing(false);
      }
    });
  }, [token, repo, dayDataMap]);

  useEffect(() => {
    if (token && repo) {
      loadWeekData();
    }
  }, [token, repo, loadWeekData]);

  return { dayDataMap, setDayDataMap, syncing, syncError, syncDayData, loadWeekData };
}
