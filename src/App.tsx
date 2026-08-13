import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppSettings, Category, Todo } from './types';
import { DEFAULT_SETTINGS } from './types';
import { formatDate } from './utils/dateUtils';
import { initAudio } from './utils/sound';
import { Header } from './components/Layout/Header';
import { CountdownTimer } from './components/Timer/CountdownTimer';
import { TabNav } from './components/Layout/TabNav';
import { TimerRing } from './components/Timer/TimerRing';
import { TimerControls } from './components/Timer/TimerControls';
import { TaskAssignModal } from './components/Timer/TaskAssignModal';
import { TodoList } from './components/TodoList/TodoList';
import { StatsOverview } from './components/Stats/StatsOverview';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { useTimer } from './hooks/useTimer';
import { useTodos } from './hooks/useTodos';
import { useGithubSync } from './hooks/useGithubSync';

type TabId = 'timer' | 'stats' | 'settings';

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('todotime_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate the previous client-side GitHub token field without retaining it.
      delete parsed.githubToken;
      return normalizeSettings({
        ...DEFAULT_SETTINGS,
        ...parsed,
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : [...DEFAULT_SETTINGS.categories],
      });
    }
    return DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

function normalizeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    workMinutes: clampInteger(settings.workMinutes, 1, 90, DEFAULT_SETTINGS.workMinutes),
    shortBreakMinutes: clampInteger(settings.shortBreakMinutes, 1, 30, DEFAULT_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clampInteger(settings.longBreakMinutes, 1, 60, DEFAULT_SETTINGS.longBreakMinutes),
    longBreakInterval: clampInteger(settings.longBreakInterval, 2, 10, DEFAULT_SETTINGS.longBreakInterval),
  };
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [tab, setTab] = useState<TabId>('timer');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const today = formatDate(new Date());

  useEffect(() => { document.documentElement.classList.toggle('dark', settings.darkMode); }, [settings.darkMode]);
  useEffect(() => { localStorage.setItem('todotime_settings', JSON.stringify(settings)); }, [settings]);

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => { initAudio(); document.removeEventListener('click', unlock); };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  const { dayDataMap, setDayDataMap, syncing, syncError, syncDayData, syncConfig, loadAll, syncBidirectional } = useGithubSync(settings.githubRepo, settings.syncSecret);
  const todosHook = useTodos();
  const {
    todos, selectedTodoId, updateTodoPomodoros, updateSubtaskPomodoros,
    mergeTodos, replaceTodos,
  } = todosHook;
  const currentTodo = todos.find(t => !t.deletedAt && t.id === currentTaskId);
  const currentSubtask = todos.filter(todo => !todo.deletedAt).flatMap(todo => todo.subtasks.filter(subtask => !subtask.deletedAt).map(subtask => ({ ...subtask, category: todo.category })))
    .find(subtask => subtask.id === currentTaskId);
  const currentTask = currentTodo ?? currentSubtask;
  const configLoadedRef = useRef(false);
  const initialLoadStartedRef = useRef(false);
  const configWatchMountedRef = useRef(false);
  const initialSettingsRef = useRef(settings);
  const initialTodosRef = useRef(todos);

  // Callback for when a pomodoro is recorded - update task's completedPomodoros
  const handlePomodoroRecorded = useCallback((record: { taskId: string | null }) => {
    if (record.taskId) {
      // Use functional updates to avoid stale closure issues
      updateTodoPomodoros(record.taskId);
      updateSubtaskPomodoros(record.taskId);
    }
  }, [updateTodoPomodoros, updateSubtaskPomodoros]);

  const timer = useTimer({ workMinutes: settings.workMinutes, shortBreakMinutes: settings.shortBreakMinutes, longBreakMinutes: settings.longBreakMinutes, longBreakInterval: settings.longBreakInterval }, settings.soundEnabled, handlePomodoroRecorded);
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

  // --- App open: load chart data, then resolve config by sync timestamp ---
  useEffect(() => {
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    let cancelled = false;
    loadAll().then(() => {
      if (cancelled) return;
      configLoadedRef.current = true;
      syncBidirectional(initialSettingsRef.current, initialTodosRef.current).then((syncResult) => {
        if (syncResult) {
          setSettings(prev => ({ ...syncResult.settings, syncSecret: prev.syncSecret }));
          mergeTodos(syncResult.todos);
        }
      });
    });
    return () => { cancelled = true; };
  }, [loadAll, syncBidirectional, mergeTodos]);

  // --- Load data when GitHub config is set (new device setup) ---
  useEffect(() => {
    if (!configWatchMountedRef.current) {
      configWatchMountedRef.current = true;
      return;
    }
    if (!settings.githubRepo || !settings.syncSecret) return;
    let cancelled = false;
    loadAll().then(() => {
      if (cancelled) return;
      syncBidirectional(settings, todos).then((syncResult) => {
        if (cancelled) return;
        if (syncResult) {
          setSettings(prev => ({ ...syncResult.settings, syncSecret: prev.syncSecret }));
          mergeTodos(syncResult.todos);
        }
      });
    });
    return () => { cancelled = true; };
  // Repo/token changes intentionally trigger loading; todo edits are handled by syncConfig.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.syncSecret, settings.githubRepo, loadAll, syncBidirectional, mergeTodos]);
  useEffect(() => {
    if (!settings.githubRepo || !settings.syncSecret) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAll();
        syncBidirectional(settings, todos).then((result) => {
          if (result) {
            setSettings(prev => ({ ...result.settings, syncSecret: prev.syncSecret }));
            mergeTodos(result.todos);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [settings.syncSecret, settings.githubRepo, loadAll, syncBidirectional, settings, todos, mergeTodos]);

  // --- Periodic sync: bidirectional every 30s for cross-device consistency ---
  useEffect(() => {
    if (!settings.githubRepo || !settings.syncSecret) return;
    const interval = setInterval(() => {
      if (syncing) return; // skip if mid-sync to avoid race
      syncBidirectional(settings, todos).then((result) => {
        if (result) {
          // Git was newer → apply merged settings + todos
          setSettings(prev => ({
            ...result.settings,
            syncSecret: prev.syncSecret,
          }));
          mergeTodos(result.todos);
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [settings.syncSecret, settings.githubRepo, settings, todos, syncBidirectional, syncing, mergeTodos]);

  // --- Periodic refresh: reload daily pomodoro data every 3 minutes for charts ---
  useEffect(() => {
    if (!settings.githubRepo || !settings.syncSecret) return;
    const interval = setInterval(() => {
      loadAll(); // refresh dayDataMap from git
    }, 180000);
    return () => clearInterval(interval);
  }, [settings.syncSecret, settings.githubRepo, loadAll]);

  // --- Sync pomodoro data: on every new pomodoro ---
  useEffect(() => {
    if (timer.todayPomodoros.length > 0) {
      syncDayData(today, timer.todayPomodoros);
    }
  }, [timer.todayPomodoros, today, syncDayData]);

  // --- Sync config: when settings or todos change (after initial load) ---
  useEffect(() => {
    if (!configLoadedRef.current) return;
    syncConfig(settings, todos);
  }, [settings, todos, syncConfig]);

  const handleSaveSettings = (s: AppSettings) => setSettings(normalizeSettings(s));

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
    // If timer is already running, just switch task without restarting
    if (!timer.isRunning) {
      timer.setTotalTime(settings.workMinutes * 60);
      timer.start();
    }
  };

  const handleQuickStartSubtask = (subtask: { id: string; title: string; category: Category }) => {
    setCurrentTaskId(subtask.id);
    timer.setTaskInfo(subtask.id, subtask.title, subtask.category);
    if (!timer.isRunning) {
      timer.setTotalTime(settings.workMinutes * 60);
      timer.start();
    }
  };

  const handleAssignAll = (results: { taskId: string | null; taskTitle: string; category: Category }[]) => {
    timer.assignAll(results);
  };

  const handleExport = () => {
    const safeSettings = { ...settings } as Partial<AppSettings>;
    delete safeSettings.syncSecret;
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
            syncSecret: importedSettings.syncSecret ?? prev.syncSecret,
            categories: Array.isArray(importedSettings.categories) && importedSettings.categories.length > 0
              ? importedSettings.categories
              : prev.categories,
          }));
        }
        if (Array.isArray(data.todos)) replaceTodos(data.todos);
      } catch {
        alert('导入失败：文件格式无效');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => { localStorage.clear(); window.location.reload(); };
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
              todayPomodoros={timer.cycleCount}
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
            />
          </div>
        )}
        {tab === 'stats' && (
          <div className="stats-page">
            <StatsOverview dayDataMap={dayDataMap} todayPomodoros={timer.todayPomodoros} categories={settings.categories} todos={todos}
              onRefresh={async () => {
                // First refresh dayDataMap from git (daily pomodoro data)
                await loadAll();
                // Then bidirectional sync for config (settings + todos)
                const result = await syncBidirectional(settings, todos);
                if (result) {
                  setSettings(prev => ({ ...result.settings, syncSecret: prev.syncSecret }));
                  mergeTodos(result.todos);
                }
              }}
              onAddTestData={(testMap) => {
                setDayDataMap(prev => {
                  const merged = new Map(prev);
                  testMap.forEach((v, k) => merged.set(k, v));
                  return merged;
                });
              }} />
          </div>
        )}
        {tab === 'settings' && (
          <SettingsPanel settings={settings} onSave={handleSaveSettings} onExport={handleExport} onImport={handleImport} onClear={handleClear} />
        )}
      </main>
      <TabNav active={tab} onChange={setTab} />

      {/* Toast notification */}
      {timer.toast && <div className="toast-notification">{timer.toast}</div>}

      {/* Assignment modal */}
      {timer.groupPhase === 'settle' && timer.pendingAssignments.length > 0 && (
        <TaskAssignModal
          assignments={timer.pendingAssignments} todos={todos}
          currentTaskName={currentTask?.title ?? null}
          onAssignAll={handleAssignAll} onStartNextGroup={timer.startNextGroup}
          onStop={timer.stop} onResetCycle={timer.resetCycle}
          onSelectTask={(id, title, cat) => { setCurrentTaskId(id); timer.setTaskInfo(id, title, cat); }}
        />
      )}

      {/* Task picker modal (click timer ring) */}
      {showTaskPicker && (
        <div className="modal-overlay" onClick={() => setShowTaskPicker(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
            <h3 className="modal-title">切换任务</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
              <button className="cat-pick-btn" style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', borderColor: '#636e72', background: !currentTaskId ? '#636e72' : undefined, color: !currentTaskId ? 'white' : undefined }}
                onClick={() => { setCurrentTaskId(null); timer.setTaskInfo(null, '', '其他'); setShowTaskPicker(false); }}>
                无任务（其他）
              </button>
              {todos.filter(t => !t.deletedAt && !t.done && !t.abandoned).map(t => (
                <button key={t.id} className="cat-pick-btn" style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', borderColor: settings.categories.find(c => c.name === t.category)?.color || '#636e72', background: currentTaskId === t.id ? settings.categories.find(c => c.name === t.category)?.color : undefined, color: currentTaskId === t.id ? 'white' : undefined }}
                  onClick={() => { setCurrentTaskId(t.id); timer.setTaskInfo(t.id, t.title, t.category); setShowTaskPicker(false); }}>
                  {t.title}（{t.category}）
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
