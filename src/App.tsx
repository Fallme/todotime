import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppSettings, Category, PomodoroRecord, Todo } from './types';
import { DEFAULT_SETTINGS, normalizeTheme } from './types';
import { formatDate } from './utils/dateUtils';
import { initAudio } from './utils/sound';
import { Header } from './components/Layout/Header';
import { CountdownTimer } from './components/Timer/CountdownTimer';
import { TabNav } from './components/Layout/TabNav';
import { TimerRing } from './components/Timer/TimerRing';
import { TimerControls } from './components/Timer/TimerControls';
import { TaskAssignModal } from './components/Timer/TaskAssignModal';
import { ManualFocusModal } from './components/Timer/ManualFocusModal';
import type { ManualFocusInput } from './components/Timer/ManualFocusModal';
import { TodoList } from './components/TodoList/TodoList';
import { StatsOverview } from './components/Stats/StatsOverview';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { SyncCodeGate } from './components/Auth/SyncCodeGate';
import type { SyncCodeMode } from './components/Auth/SyncCodeGate';
import { useTimer } from './hooks/useTimer';
import { useTodos } from './hooks/useTodos';
import { useGithubSync } from './hooks/useGithubSync';
import { loadConfig } from './services/github';
import { clearActiveSyncCode, getActiveSyncCode, getProfileId, profileStorageKey, readProfileStorage, setActiveSyncCode } from './utils/syncIdentity';
import { isPomodoroRecord } from './utils/pomodoroRules';
import { pomodoroRecordKey } from './utils/syncMerge';
import { createManualFocusRecord } from './utils/manualFocus';
import { useLanguage } from './i18n/LanguageContext';

type TabId = 'timer' | 'stats' | 'settings';

function loadSettings(profileId: string, syncCode: string): AppSettings {
  try {
    const stored = readProfileStorage('todotime_settings', profileId);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate the previous client-side GitHub token field without retaining it.
      delete parsed.githubToken;
      delete parsed.syncSecret;
      delete parsed.githubRepo;
      return normalizeSettings({
        ...DEFAULT_SETTINGS,
        ...parsed,
        syncCode,
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : [...DEFAULT_SETTINGS.categories],
      });
    }
    return { ...DEFAULT_SETTINGS, syncCode };
  } catch { return { ...DEFAULT_SETTINGS, syncCode }; }
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

function normalizeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    theme: normalizeTheme(settings.theme),
    workMinutes: clampInteger(settings.workMinutes, 1, 90, DEFAULT_SETTINGS.workMinutes),
    shortBreakMinutes: clampInteger(settings.shortBreakMinutes, 1, 30, DEFAULT_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clampInteger(settings.longBreakMinutes, 1, 60, DEFAULT_SETTINGS.longBreakMinutes),
    longBreakInterval: clampInteger(settings.longBreakInterval, 2, 10, DEFAULT_SETTINGS.longBreakInterval),
  };
}

export default function App() {
  const { language, t } = useLanguage();
  const [activeSyncCode, setActiveCode] = useState(getActiveSyncCode);
  const profileId = getProfileId(activeSyncCode);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings(profileId, activeSyncCode));
  const [tab, setTab] = useState<TabId>('timer');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showManualFocus, setShowManualFocus] = useState(false);
  const today = formatDate(new Date());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.darkMode, settings.theme]);
  useEffect(() => { localStorage.setItem(profileStorageKey('todotime_settings', profileId), JSON.stringify(settings)); }, [settings, profileId]);

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => { initAudio(); document.removeEventListener('click', unlock); };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  const { dayDataMap, syncing, syncError, lastSyncedAt, syncDayData, syncConfig, loadAll, syncBidirectional, flush } = useGithubSync(activeSyncCode, profileId);
  const todosHook = useTodos(profileId);
  const {
    todos, selectedTodoId, updateTodoPomodoros, updateSubtaskPomodoros,
    mergeTodos, replaceTodos, reconcilePomodoroRecords,
  } = todosHook;
  const currentTodo = todos.find(t => !t.deletedAt && !t.done && !t.abandoned && t.id === currentTaskId);
  const currentSubtask = todos.filter(todo => !todo.deletedAt && !todo.done && !todo.abandoned).flatMap(todo => todo.subtasks.filter(subtask => !subtask.deletedAt && !subtask.done && !subtask.abandoned).map(subtask => ({ ...subtask, category: todo.category })))
    .find(subtask => subtask.id === currentTaskId);
  const currentTask = currentTodo ?? currentSubtask;
  const configLoadedRef = useRef(false);
  const initialLoadStartedRef = useRef(false);
  const initialSettingsRef = useRef(settings);
  const initialTodosRef = useRef(todos);
  const lastDailyRefreshRef = useRef(0);
  const lastConfigCheckRef = useRef(0);
  const latestSettingsRef = useRef(settings);
  const latestTodosRef = useRef(todos);
  const syncTickRunningRef = useRef(false);

  useEffect(() => { latestSettingsRef.current = settings; }, [settings]);
  useEffect(() => { latestTodosRef.current = todos; }, [todos]);

  // Focus duration is always saved after one minute; task tomato counts start at 15 minutes.
  const handlePomodoroRecorded = useCallback((record: PomodoroRecord) => {
    if (record.completed && record.taskId && isPomodoroRecord(record)) {
      const recordId = pomodoroRecordKey(record);
      // Event IDs are additive, so simultaneous devices can union their results.
      updateTodoPomodoros(record.taskId, recordId);
      updateSubtaskPomodoros(record.taskId, recordId);
    }
  }, [updateTodoPomodoros, updateSubtaskPomodoros]);

  const timer = useTimer({ workMinutes: settings.workMinutes, shortBreakMinutes: settings.shortBreakMinutes, longBreakMinutes: settings.longBreakMinutes, longBreakInterval: settings.longBreakInterval }, settings.soundEnabled, handlePomodoroRecorded, profileId);
  const setTimerTaskInfo = timer.setTaskInfo;

  useEffect(() => {
    if (currentTaskId && !currentTask) {
      const id = setTimeout(() => {
        setCurrentTaskId(null);
        setTimerTaskInfo(null, '', '其他');
      }, 0);
      return () => clearTimeout(id);
    }
  }, [currentTaskId, currentTask, setTimerTaskInfo]);

  // Backup: also set via ref in case direct callback misses
  const setTimerOnComplete = timer.setOnComplete;
  useEffect(() => {
    setTimerOnComplete(handlePomodoroRecorded);
  }, [setTimerOnComplete, handlePomodoroRecorded]);

  useEffect(() => {
    const records = [
      ...[...dayDataMap.values()].flatMap(day => day.pomodoros),
      ...timer.todayPomodoros,
    ];
    reconcilePomodoroRecords(records);
  }, [dayDataMap, timer.todayPomodoros, reconcilePomodoroRecords]);

  // --- App open: load chart data, then resolve config by sync timestamp ---
  useEffect(() => {
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    let cancelled = false;
    loadAll().then(() => {
      if (cancelled) return;
      syncBidirectional(initialSettingsRef.current, initialTodosRef.current).then((syncResult) => {
        if (cancelled) return;
        if (syncResult) {
          setSettings(normalizeSettings({ ...DEFAULT_SETTINGS, ...syncResult.settings, syncCode: activeSyncCode }));
          mergeTodos(syncResult.todos);
        }
        configLoadedRef.current = true;
      });
    });
    return () => { cancelled = true; };
  }, [loadAll, syncBidirectional, mergeTodos, activeSyncCode]);

  const applyRemoteConfig = useCallback((result: Awaited<ReturnType<typeof syncBidirectional>>) => {
    if (!result) return;
    setSettings(normalizeSettings({ ...DEFAULT_SETTINGS, ...result.settings, syncCode: activeSyncCode }));
    mergeTodos(result.todos);
  }, [activeSyncCode, mergeTodos]);
  useEffect(() => {
    if (!activeSyncCode) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastDailyRefreshRef.current > 60_000) {
          lastDailyRefreshRef.current = now;
          lastConfigCheckRef.current = now;
          void loadAll()
            .then(() => syncBidirectional(settings, todos))
            .then(applyRemoteConfig);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeSyncCode, loadAll, syncBidirectional, settings, todos, applyRemoteConfig]);

  // --- Periodic sync: recover/merge history and config once per minute ---
  useEffect(() => {
    if (!activeSyncCode) return;
    const interval = setInterval(() => {
      if (syncTickRunningRef.current) return;
      syncTickRunningRef.current = true;
      lastConfigCheckRef.current = Date.now();
      lastDailyRefreshRef.current = Date.now();
      void loadAll()
        .then(() => syncBidirectional(latestSettingsRef.current, latestTodosRef.current))
        .then(applyRemoteConfig)
        .finally(() => { syncTickRunningRef.current = false; });
    }, 60_000);
    return () => clearInterval(interval);
  }, [activeSyncCode, loadAll, syncBidirectional, applyRemoteConfig]);

  // Best-effort flush before a refresh, deployment reload or background suspension.
  useEffect(() => {
    if (!activeSyncCode) return;
    const flushPending = () => { void flush(); };
    const handlePageHide = () => flushPending();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeSyncCode, flush]);

  // --- Sync pomodoro data: on every new pomodoro ---
  const todayPomodoros = timer.todayPomodoros;
  useEffect(() => {
    const grouped = new Map<string, typeof todayPomodoros>();
    for (const record of todayPomodoros) {
      const date = record.date || today;
      grouped.set(date, [...(grouped.get(date) ?? []), record]);
    }
    grouped.forEach((records, date) => syncDayData(date, records));
  }, [todayPomodoros, today, syncDayData]);

  // --- Sync config: when settings or todos change (after initial load) ---
  useEffect(() => {
    if (!configLoadedRef.current) return;
    syncConfig(settings, todos);
  }, [settings, todos, syncConfig]);

  // Every completed running minute immediately refreshes charts and flushes queued writes.
  useEffect(() => {
    if (timer.mode !== 'work' || !timer.isRunning || timer.runningMinutes < 1) return;
    void flush();
  }, [timer.mode, timer.isRunning, timer.runningMinutes, flush]);

  const handleSaveSettings = (s: AppSettings) => {
    const normalized = normalizeSettings(s);
    if (!timer.isRunning && timer.mode === 'work' && normalized.workMinutes !== settings.workMinutes) {
      timer.setTotalTime(normalized.workMinutes * 60);
    }
    setSettings(normalized);
  };

  const handleActivateSyncCode = async (code: string, mode: SyncCodeMode) => {
    await flush();
    const remoteProfile = await loadConfig(code);
    if (mode === 'existing' && !remoteProfile) {
      throw new Error(language === 'zh-CN' ? '没有找到这个专属码的数据，请检查是否输错。新用户请创建新专属码。' : 'No data was found for this code. Check for a typo, or create a new code.');
    }
    if (mode === 'new' && remoteProfile) {
      throw new Error(language === 'zh-CN' ? '这个专属码已经存在，请重新生成一个。' : 'This code already exists. Generate another one.');
    }

    const normalized = setActiveSyncCode(code);
    const nextProfileId = getProfileId(normalized);
    if (mode === 'new') {
      ['todotime_settings', 'todotime_todos', 'todotime_today_date', 'todotime_today_pomodoros', 'todotime_last_sync', 'todotime_history_cache']
        .forEach(key => localStorage.removeItem(profileStorageKey(key, nextProfileId)));
    }
    setActiveCode(normalized);
    window.location.reload();
  };

  const handleSelectTodo = (id: string | null) => {
    todosHook.selectTodo(id);
    // Also set as current task for timer
    if (id) {
      const todo = todos.find(t => t.id === id);
      if (todo) {
        setCurrentTaskId(todo.id);
        timer.setTaskInfo(todo.id, todo.title, todo.category);
      }
    } else {
      setCurrentTaskId(null);
      timer.setTaskInfo(null, '', '其他');
    }
  };

  const handleQuickStart = (todo: Todo) => {
    setCurrentTaskId(todo.id);
    timer.setTaskInfo(todo.id, todo.title, todo.category);
    // During active focus, only switch attribution. From pause/break, begin a fresh focus session.
    if (!timer.isRunning || timer.mode !== 'work') timer.startWork();
  };

  const handleQuickStartSubtask = (subtask: { id: string; title: string; category: Category }) => {
    setCurrentTaskId(subtask.id);
    timer.setTaskInfo(subtask.id, subtask.title, subtask.category);
    if (!timer.isRunning || timer.mode !== 'work') timer.startWork();
  };

  const handleManualFocus = (input: ManualFocusInput) => {
    let taskId = input.taskId;
    let taskTitle = language === 'zh-CN' ? '未分配' : 'Unassigned';
    if (input.newTaskTitle) {
      const created = todosHook.addTodo(input.newTaskTitle, 'medium', input.category);
      taskId = created.id;
      taskTitle = created.title;
      setCurrentTaskId(created.id);
      timer.setTaskInfo(created.id, created.title, created.category);
    } else if (taskId) {
      const existing = todos.find(todo => todo.id === taskId);
      if (existing) {
        taskTitle = existing.title;
        if (existing.category !== input.category) todosHook.changeCategory(existing.id, input.category);
      }
    }
    timer.addManualPomodoro(createManualFocusRecord({
      duration: input.duration,
      endAt: input.endAt,
      taskId,
      taskTitle,
      category: input.category,
    }));
    setShowManualFocus(false);
  };

  const handleAssignAll = (results: { taskId: string | null; taskTitle: string; category: Category }[]) => {
    timer.assignAll(results);
  };

  const handleExport = () => {
    const safeSettings = { ...settings } as Partial<AppSettings>;
    delete safeSettings.syncCode;
    const data = { settings: safeSettings, todos, todayPomodoros: timer.todayPomodoros, exportDate: new Date().toISOString() };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todotime-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as { settings?: Partial<AppSettings>; todos?: Todo[] };
        if (data.settings) {
          const importedSettings = data.settings;
          setSettings(prev => normalizeSettings({
            ...DEFAULT_SETTINGS,
            ...importedSettings,
            syncCode: prev.syncCode,
            categories: Array.isArray(importedSettings.categories) && importedSettings.categories.length > 0
              ? importedSettings.categories
              : prev.categories,
          }));
        }
        if (Array.isArray(data.todos)) replaceTodos(data.todos);
      } catch {
        alert(language === 'zh-CN' ? '导入失败：文件格式无效' : 'Import failed: invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    ['todotime_settings', 'todotime_todos', 'todotime_today_date', 'todotime_today_pomodoros', 'todotime_last_sync', 'todotime_history_cache']
      .forEach(key => localStorage.removeItem(profileStorageKey(key, profileId)));
    clearActiveSyncCode();
    window.location.reload();
  };
  const handleToggleTheme = () => setSettings(s => ({ ...s, darkMode: !s.darkMode }));
  const handleCountdownUpdate = (title: string, date: string) => setSettings(s => ({ ...s, countdownTitle: title, countdownDate: date }));

  const handleAddCategory = (name: string, color: string) => {
    if (!settings.categories.find(c => c.name === name)) {
      setSettings(s => ({ ...s, categories: [...s.categories, { name, color }] }));
    }
  };
  const handleDeleteCategory = (name: string) => {
    const replacement = settings.categories.find(category => category.name !== name);
    if (!replacement) return;
    setSettings(s => ({ ...s, categories: s.categories.filter(c => c.name !== name) }));
    todosHook.renameTodosCategory(name, replacement.name);
  };
  const handleRenameCategory = (oldName: string, newName: string, newColor: string) => {
    if (oldName !== newName && settings.categories.some(c => c.name === newName)) return;
    setSettings(s => ({
      ...s,
      categories: s.categories.map(c => c.name === oldName ? { name: newName, color: newColor } : c),
    }));
    if (oldName !== newName) {
      todosHook.renameTodosCategory(oldName, newName);
    }
  };

  // Swipe support for mobile tab switching
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 80) return; // min swipe distance
    const tabs: TabId[] = ['timer', 'stats', 'settings'];
    const idx = tabs.indexOf(tab);
    if (diff > 0 && idx < tabs.length - 1) setTab(tabs[idx + 1]); // swipe left → next
    else if (diff < 0 && idx > 0) setTab(tabs[idx - 1]); // swipe right → prev
  };

  if (!activeSyncCode) {
    return <SyncCodeGate onActivate={handleActivateSyncCode} />;
  }

  return (
    <div className="app">
      <Header darkMode={settings.darkMode} onToggleTheme={handleToggleTheme} syncing={syncing} syncError={syncError} />
      <main className="main-content" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {tab === 'timer' && (
          <div className="timer-page">
            <CountdownTimer title={settings.countdownTitle} targetDate={settings.countdownDate} onUpdate={handleCountdownUpdate} />
            <div className="timer-section">
              <div className="cycle-indicator">
                {Array.from({ length: settings.longBreakInterval }, (_, i) => (
                  <div key={i} className={`cycle-dot ${i < timer.cycleCount ? 'filled' : ''}`} />
                ))}
              </div>
              <TimerRing timeLeft={timer.timeLeft} totalTime={timer.totalTime} mode={timer.mode} isRunning={timer.isRunning} currentTaskName={currentTask?.title ?? null} currentCategory={currentTask?.category ?? null} onClick={() => setShowTaskPicker(true)} />
              <TimerControls isRunning={timer.isRunning} onStart={timer.start} onPause={timer.pause} onNewRound={timer.endNow} onSkip={timer.skip} />
            </div>
            <TodoList
              todos={todos} selectedTodoId={selectedTodoId}
              todayPomodoros={new Set([
                ...(dayDataMap.get(today)?.pomodoros ?? []),
                ...timer.todayPomodoros.filter(record => (record.date || today) === today),
              ].filter(record => record.completed && isPomodoroRecord(record)).map(record => record.id || `${record.start}-${record.end}`)).size}
              categories={settings.categories}
              onAdd={(t, p, c) => todosHook.addTodo(t, p, c)}
              onToggle={todosHook.toggleTodo} onDelete={todosHook.deleteTodo}
              onAbandon={todosHook.abandonTodo} onRestore={todosHook.restoreTodo}
              onSelect={handleSelectTodo} onQuickStart={handleQuickStart}
              onQuickStartSubtask={handleQuickStartSubtask}
              onAddSubtask={todosHook.addSubtask} onToggleSubtask={todosHook.toggleSubtask}
              onAbandonSubtask={todosHook.abandonSubtask} onRestoreSubtask={todosHook.restoreSubtask} onDeleteSubtask={todosHook.deleteSubtask}
              onChangeCategory={todosHook.changeCategory}
              onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory}
              onRenameCategory={handleRenameCategory}
              onOpenManualFocus={() => setShowManualFocus(true)}
            />
          </div>
        )}
        {tab === 'stats' && (
          <div className="stats-page">
            <StatsOverview dayDataMap={dayDataMap} todayPomodoros={timer.todayPomodoros} categories={settings.categories} todos={todos}
              runningMinutes={timer.mode === 'work' ? timer.runningMinutes : 0}
              runningCategory={currentTask?.category ?? '其他'}
              onRefresh={async () => {
                // First refresh dayDataMap from git (daily pomodoro data)
                await loadAll();
                // Then bidirectional sync for config (settings + todos)
                const result = await syncBidirectional(settings, todos);
                applyRemoteConfig(result);
              }}
            />
          </div>
        )}
        {tab === 'settings' && (
          <SettingsPanel settings={settings} onSave={handleSaveSettings} onExport={handleExport} onImport={handleImport} onClear={handleClear}
            onActivateSyncCode={handleActivateSyncCode} syncing={syncing} lastSyncedAt={lastSyncedAt} />
        )}
      </main>
      <TabNav active={tab} onChange={setTab} />

      {/* Toast notification */}
      {timer.toast && <div className="toast-notification">{timer.toast}</div>}

      {showManualFocus && (
        <ManualFocusModal
          todos={todos}
          categories={settings.categories}
          onSave={handleManualFocus}
          onClose={() => setShowManualFocus(false)}
        />
      )}

      {/* Assignment modal */}
      {timer.groupPhase === 'settle' && timer.pendingAssignments.length > 0 && (
        <TaskAssignModal
          assignments={timer.pendingAssignments} todos={todos}
          currentTaskId={currentTaskId}
          onAssignAll={handleAssignAll} onStartNextGroup={timer.startNextGroup}
          onStop={timer.stop}
          onSelectTask={(id, title, cat) => { setCurrentTaskId(id); timer.setTaskInfo(id, title, cat); }}
        />
      )}

      {/* Task picker modal (click timer ring) */}
      {showTaskPicker && (
        <div className="modal-overlay" onClick={() => setShowTaskPicker(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <h3 className="modal-title">{t('switchTask')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
              <button className="cat-pick-btn" style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', borderColor: '#636e72', background: !currentTaskId ? '#636e72' : undefined, color: !currentTaskId ? 'white' : undefined }}
                onClick={() => { setCurrentTaskId(null); timer.setTaskInfo(null, '', '其他'); setShowTaskPicker(false); }}>
                {t('noTaskOther')}
              </button>
              {todos.filter(t => !t.deletedAt && !t.done && !t.abandoned).map(t => (
                <div key={t.id} style={{ display: 'contents' }}>
                  <button className="cat-pick-btn" style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', borderColor: settings.categories.find(c => c.name === t.category)?.color || '#636e72', background: currentTaskId === t.id ? settings.categories.find(c => c.name === t.category)?.color : undefined, color: currentTaskId === t.id ? 'white' : undefined }}
                    onClick={() => { setCurrentTaskId(t.id); timer.setTaskInfo(t.id, t.title, t.category); setShowTaskPicker(false); }}>
                    {t.title}（{t.category}）
                  </button>
                  {t.subtasks.filter(subtask => !subtask.deletedAt && !subtask.done && !subtask.abandoned).map(subtask => (
                    <button key={subtask.id} className="cat-pick-btn" style={{ width: '92%', alignSelf: 'flex-end', justifyContent: 'center', padding: '7px 12px', borderColor: settings.categories.find(c => c.name === t.category)?.color || '#636e72', background: currentTaskId === subtask.id ? settings.categories.find(c => c.name === t.category)?.color : undefined, color: currentTaskId === subtask.id ? 'white' : undefined }}
                      onClick={() => { setCurrentTaskId(subtask.id); timer.setTaskInfo(subtask.id, subtask.title, t.category); setShowTaskPicker(false); }}>
                      ↳ {subtask.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
