import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSettings, ConfigData, DayData, PomodoroRecord, Todo } from '../types';
import { loadConfig, loadMultipleDays, saveConfig, saveDayData } from '../services/github';
import { formatDate } from '../utils/dateUtils';
import { profileStorageKey } from '../utils/syncIdentity';

type RemoteSettings = Omit<AppSettings, 'syncCode'>;

interface SyncResult {
  settings: RemoteSettings;
  todos: Todo[];
}

interface UseGithubSyncReturn {
  dayDataMap: Map<string, DayData>;
  setDayDataMap: React.Dispatch<React.SetStateAction<Map<string, DayData>>>;
  syncing: boolean;
  syncError: string | null;
  lastSyncedAt: string;
  syncDayData: (date: string, pomodoros: PomodoroRecord[]) => void;
  syncConfig: (settings: AppSettings, todos: Todo[]) => void;
  loadAll: () => Promise<{ settings: RemoteSettings | null; todos: Todo[] | null }>;
  syncBidirectional: (settings: AppSettings, todos: Todo[]) => Promise<SyncResult | null>;
  flush: () => Promise<void>;
}

const CONFIG_DEBOUNCE_MS = 2500;
const DAY_DEBOUNCE_MS = 1500;

function settingsSubset(settings: AppSettings): RemoteSettings {
  return {
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
}

function mergeTodos(localTodos: Todo[], remoteTodos: Todo[]): Todo[] {
  const merged = new Map(localTodos.map(todo => [todo.id, todo]));
  for (const remoteTodo of remoteTodos) {
    const localTodo = merged.get(remoteTodo.id);
    const localTime = localTodo?.updatedAt || localTodo?.createdAt || '';
    const remoteTime = remoteTodo.updatedAt || remoteTodo.createdAt || '';
    if (!localTodo || remoteTime > localTime) merged.set(remoteTodo.id, remoteTodo);
  }
  return [...merged.values()];
}

function mergeSettings(local: RemoteSettings, remote: RemoteSettings): RemoteSettings {
  return {
    ...local,
    ...remote,
    categories: remote.categories?.length ? remote.categories : local.categories,
    githubRepo: local.githubRepo,
  };
}

function comparableConfig(settings: RemoteSettings, todos: Todo[]): string {
  return JSON.stringify({ settings, todos });
}

export function useGithubSync(repo: string, syncCode: string, profileId: string): UseGithubSyncReturn {
  const syncTimeKey = profileStorageKey('todotime_last_sync', profileId);
  const [dayDataMap, setDayDataMap] = useState<Map<string, DayData>>(new Map());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => localStorage.getItem(syncTimeKey) || '');
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const configTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dayTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingConfigRef = useRef<ConfigData | null>(null);
  const pendingDaysRef = useRef(new Map<string, DayData>());
  const lastConfigHashRef = useRef('');
  const activeRequestsRef = useRef(0);

  const getSyncTime = useCallback(() => localStorage.getItem(syncTimeKey) || '', [syncTimeKey]);
  const markSynced = useCallback((value = new Date().toISOString()) => {
    localStorage.setItem(syncTimeKey, value);
    setLastSyncedAt(value);
  }, [syncTimeKey]);

  const runQueued = useCallback((operation: () => Promise<void>) => {
    queueRef.current = queueRef.current.catch(() => undefined).then(async () => {
      activeRequestsRef.current += 1;
      setSyncing(true);
      setSyncError(null);
      try {
        await operation();
        markSynced();
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : '同步失败');
      } finally {
        activeRequestsRef.current -= 1;
        if (activeRequestsRef.current === 0) setSyncing(false);
      }
    });
    return queueRef.current;
  }, [markSynced]);

  const flushConfig = useCallback(() => {
    if (configTimerRef.current) clearTimeout(configTimerRef.current);
    configTimerRef.current = null;
    const payload = pendingConfigRef.current;
    pendingConfigRef.current = null;
    if (!payload || !repo || !syncCode) return queueRef.current;
    return runQueued(async () => {
      const remote = await loadConfig(repo, syncCode);
      const mergedTodos = mergeTodos(payload.todos, remote?.todos ?? []);
      const mergedSettings = remote && remote.updatedAt > getSyncTime()
        ? mergeSettings(payload.settings, remote.settings)
        : payload.settings;
      if (remote && comparableConfig(mergedSettings, mergedTodos) === comparableConfig(remote.settings, remote.todos || [])) {
        markSynced(remote.updatedAt);
        return;
      }
      await saveConfig(repo, syncCode, { settings: mergedSettings, todos: mergedTodos, updatedAt: new Date().toISOString() });
    });
  }, [repo, syncCode, runQueued, getSyncTime, markSynced]);

  const flushDay = useCallback((date: string) => {
    const timer = dayTimersRef.current.get(date);
    if (timer) clearTimeout(timer);
    dayTimersRef.current.delete(date);
    const payload = pendingDaysRef.current.get(date);
    pendingDaysRef.current.delete(date);
    if (!payload || !repo || !syncCode) return queueRef.current;
    return runQueued(() => saveDayData(repo, syncCode, payload));
  }, [repo, syncCode, runQueued]);

  const flush = useCallback(async () => {
    flushConfig();
    for (const date of [...pendingDaysRef.current.keys()]) flushDay(date);
    await queueRef.current;
  }, [flushConfig, flushDay]);

  useEffect(() => {
    lastConfigHashRef.current = '';
    const dayTimers = dayTimersRef.current;
    return () => {
      if (configTimerRef.current) clearTimeout(configTimerRef.current);
      dayTimers.forEach(timer => clearTimeout(timer));
      dayTimers.clear();
    };
  }, [profileId]);

  const loadAll = useCallback(async () => {
    if (!repo || !syncCode) return { settings: null, todos: null };
    activeRequestsRef.current += 1;
    setSyncing(true);
    setSyncError(null);
    try {
      const dates: string[] = [];
      const now = new Date();
      for (let i = 59; i >= 0; i -= 1) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        dates.push(formatDate(day));
      }
      const [configData, days] = await Promise.all([
        loadConfig(repo, syncCode),
        loadMultipleDays(repo, syncCode, dates),
      ]);
      setDayDataMap(days);
      return { settings: configData?.settings ?? null, todos: configData?.todos ?? null };
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : '同步读取失败');
      return { settings: null, todos: null };
    } finally {
      activeRequestsRef.current -= 1;
      if (activeRequestsRef.current === 0) setSyncing(false);
    }
  }, [repo, syncCode]);

  const syncDayData = useCallback((date: string, pomodoros: PomodoroRecord[]) => {
    if (!repo || !syncCode) return;
    setDayDataMap(previous => {
      const current = previous.get(date);
      const records = new Map<string, PomodoroRecord>();
      for (const record of [...(current?.pomodoros ?? []), ...pomodoros.filter(item => (item.date || date) === date)]) {
        records.set(record.id || [record.start, record.end, record.taskId ?? '', record.createdAt].join('|'), record);
      }
      const merged = [...records.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const payload: DayData = {
        date,
        pomodoros: merged,
        tasks: current?.tasks ?? [],
        totalFocusMinutes: merged.reduce((sum, record) => sum + record.duration, 0),
        totalPomodoros: merged.length,
        totalTasksCompleted: current?.totalTasksCompleted ?? 0,
        streak: current?.streak ?? 0,
      };
      const unchanged = Boolean(current)
        && current?.totalFocusMinutes === payload.totalFocusMinutes
        && current?.totalPomodoros === payload.totalPomodoros
        && JSON.stringify(current?.pomodoros ?? []) === JSON.stringify(payload.pomodoros);
      if (unchanged) return previous;
      pendingDaysRef.current.set(date, payload);
      const existingTimer = dayTimersRef.current.get(date);
      if (existingTimer) clearTimeout(existingTimer);
      dayTimersRef.current.set(date, setTimeout(() => { void flushDay(date); }, DAY_DEBOUNCE_MS));
      const next = new Map(previous);
      next.set(date, payload);
      return next;
    });
  }, [repo, syncCode, flushDay]);

  const syncConfig = useCallback((settings: AppSettings, todos: Todo[]) => {
    if (!repo || !syncCode) return;
    const payload: ConfigData = { settings: settingsSubset(settings), todos, updatedAt: new Date().toISOString() };
    const hash = JSON.stringify({ settings: payload.settings, todos });
    if (hash === lastConfigHashRef.current) return;
    lastConfigHashRef.current = hash;
    pendingConfigRef.current = payload;
    if (configTimerRef.current) clearTimeout(configTimerRef.current);
    configTimerRef.current = setTimeout(() => { void flushConfig(); }, CONFIG_DEBOUNCE_MS);
  }, [repo, syncCode, flushConfig]);

  const syncBidirectional = useCallback(async (settings: AppSettings, todos: Todo[]): Promise<SyncResult | null> => {
    if (!repo || !syncCode) return null;
    await flush();
    activeRequestsRef.current += 1;
    setSyncing(true);
    setSyncError(null);
    try {
      const remote = await loadConfig(repo, syncCode);
      if (!remote) {
        const payload: ConfigData = { settings: settingsSubset(settings), todos, updatedAt: new Date().toISOString() };
        await saveConfig(repo, syncCode, payload);
        markSynced(payload.updatedAt);
        return { settings: payload.settings, todos };
      }

      const mergedSettings = remote.updatedAt > getSyncTime()
        ? mergeSettings(settingsSubset(settings), remote.settings)
        : settingsSubset(settings);
      const mergedTodos = mergeTodos(todos, remote.todos || []);
      if (comparableConfig(mergedSettings, mergedTodos) === comparableConfig(remote.settings, remote.todos || [])) {
        markSynced(remote.updatedAt);
        return { settings: mergedSettings, todos: mergedTodos };
      }
      const payload: ConfigData = { settings: mergedSettings, todos: mergedTodos, updatedAt: new Date().toISOString() };
      await saveConfig(repo, syncCode, payload);
      markSynced(payload.updatedAt);
      return { settings: mergedSettings, todos: mergedTodos };
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : '同步失败');
      return null;
    } finally {
      activeRequestsRef.current -= 1;
      if (activeRequestsRef.current === 0) setSyncing(false);
    }
  }, [repo, syncCode, flush, getSyncTime, markSynced]);

  return { dayDataMap, setDayDataMap, syncing, syncError, lastSyncedAt, syncDayData, syncConfig, loadAll, syncBidirectional, flush };
}
