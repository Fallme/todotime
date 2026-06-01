import { useState, useCallback, useEffect } from 'react';
import type { AppSettings, PomodoroRecord, Category, Todo } from './types';
import { DEFAULT_SETTINGS } from './types';
import { formatDate } from './utils/dateUtils';
import { Header } from './components/Layout/Header';
import { TabNav } from './components/Layout/TabNav';
import { TimerRing } from './components/Timer/TimerRing';
import { TimerControls } from './components/Timer/TimerControls';
import { TaskAssignModal } from './components/Timer/TaskAssignModal';
import { TodoList } from './components/TodoList/TodoList';
import { StatsPanel } from './components/Stats/StatsPanel';
import { WeeklyChart } from './components/Stats/WeeklyChart';
import { HeatMap } from './components/Stats/HeatMap';
import { StreakCard } from './components/Stats/StreakCard';
import { CategoryChart } from './components/Stats/CategoryChart';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { useTimer } from './hooks/useTimer';
import { useTodos } from './hooks/useTodos';
import { useStats } from './hooks/useStats';
import { useGithubSync } from './hooks/useGithubSync';

type TabId = 'timer' | 'stats' | 'settings';

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('todotime_settings');
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [tab, setTab] = useState<TabId>('timer');
  const [todayPomodoros, setTodayPomodoros] = useState<PomodoroRecord[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const today = formatDate(new Date());

  useEffect(() => { document.documentElement.classList.toggle('dark', settings.darkMode); }, [settings.darkMode]);
  useEffect(() => { localStorage.setItem('todotime_settings', JSON.stringify(settings)); }, [settings]);

  const { dayDataMap, syncing, syncError, syncDayData } = useGithubSync(settings.githubRepo, settings.githubToken);
  const todosHook = useTodos();
  const { todos, selectedTodoId } = todosHook;
  const currentTask = todos.find(t => t.id === currentTaskId);

  const handlePomodoroComplete = useCallback((record: PomodoroRecord) => {
    setTodayPomodoros(prev => { const u = [...prev, record]; syncDayData(today, u, todos); return u; });
    if (record.taskId) todosHook.updateTodoPomodoros(record.taskId);
    setCurrentTaskId(null);
  }, [today, todos, todosHook, syncDayData]);

  const timer = useTimer();
  useEffect(() => { timer.setOnComplete(handlePomodoroComplete); }, [timer.setOnComplete, handlePomodoroComplete]);

  const stats = useStats(dayDataMap, todayPomodoros, today);

  const handleSaveSettings = (s: AppSettings) => setSettings(s);

  // Quick start from task list: select task + start timer
  const handleQuickStart = (todo: Todo) => {
    setCurrentTaskId(todo.id);
    timer.setTaskInfo(todo.id, todo.title, todo.category);
    timer.setTotalTime(settings.workMinutes * 60);
    timer.start();
  };

  // Manual assign from timer (when no task pre-selected)
  const handleAssignAll = (results: { taskId: string | null; taskTitle: string; category: Category }[]) => {
    timer.assignAll(results);
  };

  const handleExport = () => {
    const data = { settings, todos, todayPomodoros, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `todotime-backup-${today}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { try { const d = JSON.parse(e.target?.result as string); if (d.settings) setSettings({ ...DEFAULT_SETTINGS, ...d.settings }); } catch { alert('导入失败'); } };
    reader.readAsText(file);
  };

  const handleClear = () => { localStorage.clear(); window.location.reload(); };
  const handleToggleTheme = () => setSettings(s => ({ ...s, darkMode: !s.darkMode }));

  return (
    <div className="app">
      <Header darkMode={settings.darkMode} onToggleTheme={handleToggleTheme} syncing={syncing} syncError={syncError} />
      <main className="main-content">
        {tab === 'timer' && (
          <div className="timer-page">
            <div className="timer-section">
              <div className="cycle-indicator">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className={`cycle-dot ${i < timer.cycleCount ? 'filled' : ''}`} />
                ))}
              </div>

              <TimerRing
                timeLeft={timer.timeLeft} totalTime={timer.totalTime}
                mode={timer.mode} isRunning={timer.isRunning}
                currentTaskName={currentTask?.title ?? null}
              />

              <TimerControls
                isRunning={timer.isRunning}
                onStart={timer.start} onPause={timer.pause}
                onReset={timer.reset} onSkip={timer.skip}
              />
            </div>

            <TodoList
              todos={todos} selectedTodoId={selectedTodoId}
              todayPomodoros={timer.totalPomodoros}
              onAdd={(t, p, c) => todosHook.addTodo(t, p, c)}
              onToggle={todosHook.toggleTodo}
              onDelete={todosHook.deleteTodo}
              onAbandon={todosHook.abandonTodo}
              onRestore={todosHook.restoreTodo}
              onSelect={todosHook.selectTodo}
              onQuickStart={handleQuickStart}
              onAddSubtask={todosHook.addSubtask}
              onToggleSubtask={todosHook.toggleSubtask}
              onDeleteSubtask={todosHook.deleteSubtask}
            />
          </div>
        )}
        {tab === 'stats' && (
          <div className="stats-page">
            <StatsPanel stats={stats} />
            <StreakCard streak={stats.streak} totalPomodoros={stats.totalPomodoros} totalFocusHours={stats.totalFocusHours} />
            <CategoryChart dayDataMap={dayDataMap} todayPomodoros={todayPomodoros} />
            <WeeklyChart data={stats.weeklyData} />
            <HeatMap data={stats.monthlyData} />
          </div>
        )}
        {tab === 'settings' && (
          <SettingsPanel settings={settings} onSave={handleSaveSettings} onExport={handleExport} onImport={handleImport} onClear={handleClear} />
        )}
      </main>
      <TabNav active={tab} onChange={setTab} />
      {timer.pendingAssignments.length > 0 && (
        <TaskAssignModal assignments={timer.pendingAssignments} todos={todos} onAssignAll={handleAssignAll} />
      )}
    </div>
  );
}
