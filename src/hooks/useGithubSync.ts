import { useState, useCallback, useRef } from 'react';
import type { DayData, PomodoroRecord, AppSettings, Todo, ConfigData } from '../types';
import { saveDayData, loadMultipleDays, saveConfig, loadConfig as fetchConfig } from '../services/github';
import { formatDate } from '../utils/dateUtils';

interface UseGithubSyncReturn {
  dayDataMap: Map<string, DayData>;
  setDayDataMap: React.Dispatch<React.SetStateAction<Map<string, DayData>>>;
  syncing: boolean;
  syncError: string | null;
  /** Sync pomodoro data for a specific day to git */
  syncDayData: (date: string, pomodoros: PomodoroRecord[]) => void;
  /** Sync config (settings + todos) to git immediately */
  syncConfig: (settings: AppSettings, todos: Todo[]) => void;
  /** Load everything from git: config + 31 days of data */
  loadAll: () => Promise<{ settings: Omit<AppSettings, 'githubToken'> | null; todos: Todo[] | null }>;
}

export function useGithubSync(repo: string, token: string): UseGithubSyncReturn {
  const [dayDataMap, setDayDataMap] = useState<Map<string, DayData>>(new Map());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const lastConfigHashRef = useRef('');

  // --- Load all data from git on app open ---
  const loadAll = useCallback(async (): Promise<{ settings: Omit<AppSettings, 'githubToken'> | null; todos: Todo[] | null }> => {
    if (!token || !repo) return { settings: null, todos: null };
    setSyncing(true);
    setSyncError(null);

    try {
      // Parallel: config + 31 days of pomodoro data
      const dates: string[] = [];
      const now = new Date();
      for (let i = 30; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(formatDate(d));
      }

      const [configData, dayData] = await Promise.all([
        fetchConfig(repo, token).catch(() => null),
        loadMultipleDays(repo, token, dates).catch(() => new Map<string, DayData>()),
      ]);

      // Merge day data
      setDayDataMap(prev => {
        const merged = new Map(prev);
        dayData.forEach((v, k) => merged.set(k, v));
        return merged;
      });

      return {
        settings: configData?.settings ?? null,
        todos: configData?.todos ?? null,
      };
    } catch (e) {
      setSyncError((e as Error).message);
      return { settings: null, todos: null };
    } finally {
      setSyncing(false);
    }
  }, [repo, token]);

  // --- Sync pomodoro data for a day (only pomodoro-related) ---
  const syncDayData = useCallback((date: string, pomodoros: PomodoroRecord[]) => {
    if (!token || !repo) return;

    // Use functional state update to avoid stale closure
    setDayDataMap(prev => {
      const existing = prev.get(date);
      // Deduplicate: keep existing pomodoros, append only new ones
      const allPomodoros = existing
        ? [...existing.pomodoros, ...pomodoros.slice(existing.pomodoros.length)]
        : pomodoros;
      const totalFocusMinutes = allPomodoros.reduce((s, p) => s + p.duration, 0);

      const dayData: DayData = {
        date,
        pomodoros: allPomodoros,
        tasks: existing?.tasks ?? [],
        totalFocusMinutes,
        totalPomodoros: allPomodoros.length,
        totalTasksCompleted: existing?.totalTasksCompleted ?? 0,
        streak: existing?.streak ?? 0,
      };

      const next = new Map(prev);
      next.set(date, dayData);

      // Queue the GitHub commit
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

      return next;
    });
  }, [token, repo]);

  // --- Sync config (settings + todos) immediately on change ---
  const syncConfig = useCallback((settings: AppSettings, todos: Todo[]) => {
    if (!token || !repo) return;

    // Hash to skip if nothing changed
    const configPayload: ConfigData = {
      settings: {
        workMinutes: settings.workMinutes,
        shortBreakMinutes: settings.shortBreakMinutes,
        longBreakMinutes: settings.longBreakMinutes,
        longBreakInterval: settings.longBreakInterval,
        soundEnabled: settings.soundEnabled,
        darkMode: settings.darkMode,
        githubRepo: settings.githubRepo,
        countdownTitle: settings.countdownTitle,
        countdownDate: settings.countdownDate,
        categories: settings.categories,
      },
      todos,
      updatedAt: new Date().toISOString(),
    };
    const hash = JSON.stringify(configPayload);
    if (hash === lastConfigHashRef.current) return; // skip duplicate
    lastConfigHashRef.current = hash;

    // Queue the commit immediately
    queueRef.current = queueRef.current.then(async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        await saveConfig(repo, token, configPayload);
      } catch (e) {
        setSyncError((e as Error).message);
      } finally {
        setSyncing(false);
      }
    });
  }, [token, repo]);

  return { dayDataMap, setDayDataMap, syncing, syncError, syncDayData, syncConfig, loadAll };
}
