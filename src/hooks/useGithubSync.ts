import { useState, useCallback, useRef } from 'react';
import type { DayData, PomodoroRecord, AppSettings, Todo, ConfigData } from '../types';
import { saveDayData, loadMultipleDays, saveConfig, loadConfig as fetchConfig } from '../services/github';
import { formatDate } from '../utils/dateUtils';

interface UseGithubSyncReturn {
  dayDataMap: Map<string, DayData>;
  setDayDataMap: React.Dispatch<React.SetStateAction<Map<string, DayData>>>;
  syncing: boolean;
  syncError: string | null;
  syncDayData: (date: string, pomodoros: PomodoroRecord[]) => void;
  syncConfig: (settings: AppSettings, todos: Todo[]) => void;
  loadAll: () => Promise<{ settings: Omit<AppSettings, 'syncSecret'> | null; todos: Todo[] | null }>;
  syncBidirectional: (settings: AppSettings, todos: Todo[]) => Promise<{ settings: Omit<AppSettings, 'syncSecret'>; todos: Todo[] } | null>;
}

export function useGithubSync(repo: string, token: string): UseGithubSyncReturn {
  const [dayDataMap, setDayDataMap] = useState<Map<string, DayData>>(new Map());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const lastConfigHashRef = useRef('');
  // Persist sync timestamp to localStorage for reliability across refreshes
  const getSyncTime = () => localStorage.getItem('todotime_last_sync') || '';
  const setSyncTime = (t: string) => localStorage.setItem('todotime_last_sync', t);

  const mergePomodoros = (remote: PomodoroRecord[], local: PomodoroRecord[]) => {
    const byKey = new Map<string, PomodoroRecord>();
    for (const record of [...remote, ...local]) {
      const key = [record.start, record.end, record.taskId ?? '', record.duration, record.createdAt].join('|');
      byKey.set(key, record);
    }
    return [...byKey.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  };

  const mergeTodoLists = (localTodos: Todo[], remoteTodos: Todo[]): Todo[] => {
    const merged = new Map(localTodos.map(todo => [todo.id, todo]));
    for (const remoteTodo of remoteTodos) {
      const localTodo = merged.get(remoteTodo.id);
      const localTime = localTodo?.updatedAt || localTodo?.createdAt || '';
      const remoteTime = remoteTodo.updatedAt || remoteTodo.createdAt || '';
      if (!localTodo || remoteTime > localTime) merged.set(remoteTodo.id, remoteTodo);
    }
    return [...merged.values()];
  };

  // --- Load all data from git on app open ---
  const loadAll = useCallback(async (): Promise<{ settings: Omit<AppSettings, 'syncSecret'> | null; todos: Todo[] | null }> => {
    if (!repo || !token) return { settings: null, todos: null };
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
    if (!repo || !token) return;

    setDayDataMap(prev => {
      const existing = prev.get(date);
      const allPomodoros = mergePomodoros(existing?.pomodoros ?? [], pomodoros);
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
    if (!repo || !token) return;

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
        setSyncTime(new Date().toISOString());
      } catch (e) {
        setSyncError((e as Error).message);
      } finally {
        setSyncing(false);
      }
    });
  }, [token, repo]);

  // --- Incremental merge: only merge changed settings fields ---
  const mergeSettings = (local: Omit<AppSettings, 'syncSecret'>, git: Omit<AppSettings, 'syncSecret'>): Omit<AppSettings, 'syncSecret'> => {
    return {
      workMinutes: git.workMinutes ?? local.workMinutes,
      shortBreakMinutes: git.shortBreakMinutes ?? local.shortBreakMinutes,
      longBreakMinutes: git.longBreakMinutes ?? local.longBreakMinutes,
      longBreakInterval: git.longBreakInterval ?? local.longBreakInterval,
      soundEnabled: git.soundEnabled ?? local.soundEnabled,
      darkMode: git.darkMode ?? local.darkMode,
      githubRepo: git.githubRepo ?? local.githubRepo,
      countdownTitle: git.countdownTitle ?? local.countdownTitle,
      countdownDate: git.countdownDate ?? local.countdownDate,
      categories: git.categories?.length > 0 ? git.categories : local.categories,
    };
  };

  // --- Bidirectional sync with incremental merge ---
  const syncBidirectional = useCallback(async (settings: AppSettings, todos: Todo[]): Promise<{ settings: Omit<AppSettings, 'syncSecret'>; todos: Todo[] } | null> => {
    if (!repo || !token) return null;
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
        setSyncTime(payload.updatedAt);
        return null;
      }

      const gitTime = gitConfig.updatedAt || '';
      const localTime = getSyncTime();

      if (gitTime > localTime) {
        // Git is newer → incremental merge settings + per-todo merge
        const localSettings = {
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
        const mergedSettings = mergeSettings(localSettings, gitConfig.settings);

        const mergedTodos = mergeTodoLists(todos, gitConfig.todos || []);

        // Push merged result back to git to keep it complete
        const pushPayload: ConfigData = { settings: mergedSettings, todos: mergedTodos, updatedAt: new Date().toISOString() };
        await saveConfig(repo, token, pushPayload);
        setSyncTime(pushPayload.updatedAt);
        return { settings: mergedSettings, todos: mergedTodos };
      } else if (localTime && localTime > gitTime) {
        // Local is newer, but merge remote-only items before pushing so another device's data is not lost.
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
        const payload: ConfigData = { settings: settingsSubset, todos: mergeTodoLists(todos, gitConfig.todos || []), updatedAt: new Date().toISOString() };
        await saveConfig(repo, token, payload);
        setSyncTime(payload.updatedAt);
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
