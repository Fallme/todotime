import { useState, useEffect } from 'react';
import type { AppSettings, Category, DayData, Todo } from './types';
import { DEFAULT_SETTINGS } from './types';
import { formatDate } from './utils/dateUtils';
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

type TabId = 'timer' | 'stats' | 'settings';

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('todotime_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed, categories: [...DEFAULT_SETTINGS.categories] };
    }
    return DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

function loadDayDataMap(): Map<string, DayData> {
  try {
    const stored = localStorage.getItem('todotime_daydata');
    if (stored) {
      const parsed = JSON.parse(stored) as [string, DayData][];
      return new Map(parsed);
    }
  } catch { /* ignore */ }
  return new Map();
}

function saveDayDataMap(map: Map<string, DayData>) {
  localStorage.setItem('todotime_daydata', JSON.stringify([...map.entries()]));
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [tab, setTab] = useState<TabId>('timer');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [dayDataMap, setDayDataMap] = useState<Map<string, DayData>>(loadDayDataMap);
  const today = formatDate(new Date());

  useEffect(() => { document.documentElement.classList.toggle('dark', settings.darkMode); }, [settings.darkMode]);
  useEffect(() => { localStorage.setItem('todotime_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { saveDayDataMap(dayDataMap); }, [dayDataMap]);

  const todosHook = useTodos();
  const { todos, selectedTodoId } = todosHook;
  const currentTask = todos.find(t => t.id === currentTaskId);

  const timer = useTimer({ workMinutes: settings.workMinutes, shortBreakMinutes: settings.shortBreakMinutes, longBreakMinutes: settings.longBreakMinutes, longBreakInterval: settings.longBreakInterval }, settings.soundEnabled);

  // Wire up onComplete callback to update task's completedPomodoros
  useEffect(() => {
    timer.setOnComplete((record) => {
      if (record.taskId) {
        const isSubtask = todos.some(t => t.subtasks.some(s => s.id === record.taskId));
        if (isSubtask) {
          todosHook.updateSubtaskPomodoros(record.taskId);
        } else {
          todosHook.updateTodoPomodoros(record.taskId);
        }
      }
    });
  }, [timer.setOnComplete, todosHook, todos]);

  // Save today's pomodoros to dayDataMap
  useEffect(() => {
    if (timer.todayPomodoros.length > 0) {
      setDayDataMap(prev => {
        const existing = prev.get(today);
        const allPomodoros = existing
          ? [...existing.pomodoros, ...timer.todayPomodoros.slice(existing.pomodoros.length)]
          : timer.todayPomodoros;
        const totalFocusMinutes = allPomodoros.reduce((s, p) => s + p.duration, 0);
        const next = new Map(prev);
        next.set(today, {
          date: today,
          pomodoros: allPomodoros,
          tasks: existing?.tasks ?? [],
          totalFocusMinutes,
          totalPomodoros: allPomodoros.length,
          totalTasksCompleted: existing?.totalTasksCompleted ?? 0,
          streak: existing?.streak ?? 0,
        });
        return next;
      });
    }
  }, [timer.todayPomodoros, today]);

  const handleSaveSettings = (s: AppSettings) => setSettings(s);

  const handleQuickStart = (todo: Todo) => {
    setCurrentTaskId(todo.id);
    timer.setTaskInfo(todo.id, todo.title, todo.category);
    if (!timer.isRunning) {
      timer.setTotalTime(settings.workMinutes * 60);
      timer.start();
    }
  };

  const handleQuickStartSubtask = (subtask: { id: string; title: string; category: Category }) => {
    setCurrentTaskId(null);
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
    const data = { settings, todos, todayPomodoros: timer.todayPomodoros, exportDate: new Date().toISOString() };
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
    reader.onload = (e) => { try { const d = JSON.parse(e.target?.result as string); if (d.settings) setSettings({ ...DEFAULT_SETTINGS, ...d.settings }); } catch { alert('导入失败'); } };
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
    setSettings(s => ({ ...s, categories: s.categories.filter(c => c.name !== name) }));
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

  return (
    <div className="app">
      <Header darkMode={settings.darkMode} onToggleTheme={handleToggleTheme} />
      <main className="main-content">
        {tab === 'timer' && (
          <div className="timer-page">
            <CountdownTimer title={settings.countdownTitle} targetDate={settings.countdownDate} onUpdate={handleCountdownUpdate} />
            <div className="timer-section">
              <div className="cycle-indicator">
                {Array.from({ length: settings.longBreakInterval }, (_, i) => (
                  <div key={i} className={`cycle-dot ${i < timer.cycleCount ? 'filled' : ''}`} />
                ))}
              </div>
              <TimerRing timeLeft={timer.timeLeft} totalTime={timer.totalTime} mode={timer.mode} isRunning={timer.isRunning} currentTaskName={currentTask?.title ?? null} currentCategory={currentTask?.category ?? null} />
              <TimerControls isRunning={timer.isRunning} onStart={timer.start} onPause={timer.pause} onNewRound={timer.endNow} onSkip={timer.skip} />
            </div>
            <TodoList
              todos={todos} selectedTodoId={selectedTodoId}
              todayPomodoros={timer.totalPomodoros}
              categories={settings.categories}
              onAdd={(t, p, c) => todosHook.addTodo(t, p, c)}
              onToggle={todosHook.toggleTodo} onDelete={todosHook.deleteTodo}
              onAbandon={todosHook.abandonTodo} onRestore={todosHook.restoreTodo}
              onSelect={todosHook.selectTodo} onQuickStart={handleQuickStart}
              onQuickStartSubtask={handleQuickStartSubtask}
              onAddSubtask={todosHook.addSubtask} onToggleSubtask={todosHook.toggleSubtask}
              onAbandonSubtask={todosHook.abandonSubtask} onDeleteSubtask={todosHook.deleteSubtask}
              onChangeCategory={todosHook.changeCategory}
              onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory}
              onRenameCategory={handleRenameCategory}
            />
          </div>
        )}
        {tab === 'stats' && (
          <div className="stats-page">
            <StatsOverview dayDataMap={dayDataMap} todayPomodoros={timer.todayPomodoros} categories={settings.categories} todos={todos}
              onRefresh={async () => { setDayDataMap(loadDayDataMap()); }}
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
        />
      )}
    </div>
  );
}
