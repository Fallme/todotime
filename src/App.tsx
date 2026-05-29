import { useState, useCallback, useEffect } from 'react';
import type { AppSettings, PomodoroRecord, Category } from './types';
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
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function formatTaskFocusTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [tab, setTab] = useState<TabId>('timer');
  const [todayPomodoros, setTodayPomodoros] = useState<PomodoroRecord[]>([]);
  const today = formatDate(new Date());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  useEffect(() => {
    localStorage.setItem('todotime_settings', JSON.stringify(settings));
  }, [settings]);

  const { dayDataMap, syncing, syncError, syncDayData } = useGithubSync(
    settings.githubRepo,
    settings.githubToken,
  );

  const todosHook = useTodos();
  const { todos, selectedTodoId } = todosHook;

  const handlePomodoroComplete = useCallback((record: PomodoroRecord) => {
    setTodayPomodoros(prev => {
      const updated = [...prev, record];
      syncDayData(today, updated, todos);
      return updated;
    });
    if (record.taskId) {
      todosHook.updateTodoPomodoros(record.taskId);
    }
  }, [today, todos, todosHook, syncDayData]);

  const timer = useTimer(settings.workMinutes, settings.soundEnabled);

  useEffect(() => {
    timer.setOnComplete(handlePomodoroComplete);
  }, [timer.setOnComplete, handlePomodoroComplete]);

  const stats = useStats(dayDataMap, todayPomodoros, today);

  const handleSaveSettings = (newSettings: AppSettings) => setSettings(newSettings);

  const handleAssignPomodoro = (taskId: string | null, taskTitle: string, category: Category) => {
    timer.assignPomodoro(taskId, taskTitle, category);
  };

  const handleExport = () => {
    const data = { settings, todos, todayPomodoros, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todotime-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      } catch { alert('导入失败'); }
    };
    reader.readAsText(file);
  };

  const handleClear = () => { localStorage.clear(); window.location.reload(); };
  const handleToggleTheme = () => setSettings(s => ({ ...s, darkMode: !s.darkMode }));

  const handleDragAdjust = (newTimeLeft: number, _newTotalTime: number) => {
    timer.setTotalTime(newTimeLeft);
  };

  return (
    <div className="app">
      <Header darkMode={settings.darkMode} onToggleTheme={handleToggleTheme} syncing={syncing} syncError={syncError} />

      <main className="main-content">
        {tab === 'timer' && (
          <div className="timer-page">
            <div className="timer-section">
              {/* Completed pomodoro dots */}
              <div className="cycle-indicator">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className={`cycle-dot ${i < timer.completedPomodoros % 4 ? 'filled' : ''}`} />
                ))}
              </div>

              {timer.taskFocusMode ? (
                <div className="timer-ring-container">
                  <div className="task-focus-display">
                    <div className="task-focus-time">{formatTaskFocusTime(timer.taskFocusElapsed)}</div>
                    <div className="task-focus-label">任务专注中</div>
                  </div>
                </div>
              ) : (
                <TimerRing
                  timeLeft={timer.timeLeft}
                  totalTime={timer.totalTime}
                  mode={timer.mode}
                  isRunning={timer.isRunning}
                  onDragAdjust={handleDragAdjust}
                />
              )}

              <TimerControls
                isRunning={timer.isRunning}
                taskFocusMode={timer.taskFocusMode}
                onStart={timer.start}
                onPause={timer.pause}
                onReset={timer.reset}
                onSkip={timer.skip}
                onStartTaskFocus={timer.startTaskFocus}
                onStopTaskFocus={timer.stopTaskFocus}
              />

              <div className="today-summary">
                今日 <strong>{timer.completedPomodoros}</strong> 番茄
                {stats.todayFocusMinutes > 0 && <> · {stats.todayFocusMinutes}min</>}
              </div>
            </div>

            <TodoList
              todos={todos}
              selectedTodoId={selectedTodoId}
              onAdd={(t, p, c) => todosHook.addTodo(t, p, c)}
              onToggle={todosHook.toggleTodo}
              onDelete={todosHook.deleteTodo}
              onSelect={todosHook.selectTodo}
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

      {timer.pendingAssignment && (
        <TaskAssignModal
          duration={timer.pendingAssignment.duration}
          todos={todos}
          onAssign={handleAssignPomodoro}
        />
      )}
    </div>
  );
}
