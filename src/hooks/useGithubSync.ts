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
  /** Bidirectional sync: pull newer from git, push newer to git. Returns merged data if git was newer. */
  syncBidirectional: (settings: AppSettings, todos: Todo[]) => Promise<{ settings: Omit<AppSettings, 'githubToken'>; todos: Todo[] } | null>;
}

export function useGithubSync(repo: string, token: string): UseGithubSyncReturn {
  const [dayDataMap, setDayDataMap] = useState<Map<string, DayData>>(new Map());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const lastConfigHashRef = useRef('');
  const lastSyncAtRef = useRef(''); // ISO timestamp of last successful sync

  // --- Load all data from git on app open ---
  const loadAll = useCallback(async (): Promise<{ settings: Omit<AppSettings, 'githubToken'> | null; todos: Todo[] | null }> => {
    if (!token || !repo) return { settings: null, todos: null };
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

      const [configData, dayData] = await Promise.all([
        fetchConfig(repo, token).catch(() => null),
        loadMultipleDays(repo, token, dates).catch(() => new Map<string, DayData>()),
      ]);

      setDayDataMap(prev => {
        const merged = new Map(prev);
        dayData.forEach((v, k) => merged.set(k, v));
        return merged;
      });

      lastSyncAtRef.current = new Date().toISOString();

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

  // --- Sync pomodoro data for a day ---
  const syncDayData = useCallback((date: string, pomodoros: PomodoroRecord[]) => {
    if (!token || !repo) return;

    setDayDataMap(prev => {
      const existing = prev.get(date);
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

    const settingsSubset = {
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
    };
    const hash = JSON.stringify({ settings: settingsSubset, todos });
    if (hash === lastConfigHashRef.current) return;
    lastConfigHashRef.current = hash;

    const configPayload: ConfigData = {
      settings: settingsSubset,
      todos,
      updatedAt: new Date().toISOString(),
    };

    queueRef.current = queueRef.current.then(async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        await saveConfig(repo, token, configPayload);
        lastSyncAtRef.current = new Date().toISOString();
      } catch (e) {
        setSyncError((e as Error).message);
      } finally {
        setSyncing(false);
      }
    });
  }, [token, repo]);

  // --- Bidirectional sync: pull newer from git, push newer to git ---
  const syncBidirectional = useCallback(async (settings: AppSettings, todos: Todo[]): Promise<{ settings: Omit<AppSettings, 'githubToken'>; todos: Todo[] } | null> => {
    if (!token || !repo) return null;
    setSyncing(true);
    setSyncError(null);

    try {
      const gitConfig = await fetchConfig(repo, token).catch(() => null);
      if (!gitConfig) {
        // No git config → push local
        const settingsSubset = {
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
        };
        const payload: ConfigData = { settings: settingsSubset, todos, updatedAt: new Date().toISOString() };
        await saveConfig(repo, token, payload);
        lastSyncAtRef.current = payload.updatedAt;
        return null;
      }

      const gitTime = gitConfig.updatedAt || '';
      const localTime = lastSyncAtRef.current;

      if (gitTime > localTime) {
        // Git is newer → pull settings + merge todos
        const localMap = new Map(todos.map(t => [t.id, t]));
        const gitMap = new Map((gitConfig.todos || []).map(t => [t.id, t]));
        const mergedTodos: Todo[] = [];
        const allIds = new Set([...localMap.keys(), ...gitMap.keys()]);

        for (const id of allIds) {
          const local = localMap.get(id);
          const git = gitMap.get(id);
          if (local && !git) {
            mergedTodos.push(local);
          } else if (!local && git) {
            mergedTodos.push(git);
          } else if (local && git) {
            const lt = local.updatedAt || local.createdAt || '';
            const gt = git.updatedAt || git.createdAt || '';
            mergedTodos.push(gt > lt ? git : local);
          }
        }

        lastSyncAtRef.current = gitTime;
        return { settings: gitConfig.settings, todos: mergedTodos };
      } else if (localTime && localTime > gitTime) {
        // Local is newer → push to git
        const settingsSubset = {
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
        };
        const payload: ConfigData = { settings: settingsSubset, todos, updatedAt: new Date().toISOString() };
        await saveConfig(repo, token, payload);
        lastSyncAtRef.current = payload.updatedAt;
      }
      // else equal → no action
      return null;
    } catch (e) {
      setSyncError((e as Error).message);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [token, repo]);

  return { dayDataMap, setDayDataMap, syncing, syncError, syncDayData, syncConfig, loadAll, syncBidirectional };
}
