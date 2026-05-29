import { useState, useCallback, useEffect } from 'react';
import type { AppSettings, PomodoroRecord, Priority, Category } from './types';
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
  const selectedTodo = todos.find(t => t.id === selectedTodoId);

  const handlePomodoroComplete = useCallback((record: PomodoroRecord) => {
    setTodayPomodoros(prev => {
      const updated = [...prev, record];
      syncDayData(today, updated, todos);
      return updated;
    });
    // Update task's completed pomodoro count
    if (record.taskId) {
      todosHook.updateTodoPomodoros(record.taskId);
    }
  }, [today, todos, todosHook, syncDayData]);

  const timer = useTimer(settings, settings.soundEnabled);

  // Wire up the onComplete callback
  useEffect(() => {
    timer.setOnComplete(handlePomodoroComplete);
  }, [timer.setOnComplete, handlePomodoroComplete]);

  const stats = useStats(dayDataMap, todayPomodoros, today);

  const handleSaveSettings = (newSettings: AppSettings) => setSettings(newSettings);

  const handleAddTodo = (title: string, priority: Priority, category: Category, estimatedPomodoros: number) => {
    todosHook.addTodo(title, priority, category, estimatedPomodoros);
  };

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
      } catch {
        alert('导入失败：文件格式不正确');
      }
    };
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
                {Array.from({ length: settings.longBreakInterval }, (_, i) => (
                  <div key={i} className={`cycle-dot ${i < timer.completedPomodoros % settings.longBreakInterval ? 'filled' : ''}`} />
                ))}
              </div>
              <TimerRing timeLeft={timer.timeLeft} totalTime={timer.totalTime} mode={timer.mode} />

              {/* Quick adjust controls */}
              {timer.mode === 'work' && !timer.isRunning && !timer.pendingAssignment && (
                <div className="quick-adjust">
                  <button className="quick-adjust-btn" onClick={() => timer.adjustWorkMinutes(-5)} disabled={timer.workMinutes <= 1}>−5</button>
                  <span className="quick-adjust-label">{timer.workMinutes} 分钟</span>
                  <button className="quick-adjust-btn" onClick={() => timer.adjustWorkMinutes(5)} disabled={timer.workMinutes >= 90}>+5</button>
                </div>
              )}
              {(timer.mode === 'shortBreak' || timer.mode === 'longBreak') && !timer.isRunning && (
                <div className="quick-adjust">
                  <button className="quick-adjust-btn" onClick={() => timer.adjustBreakMinutes(-1)} disabled={timer.breakMinutes <= 1}>−1</button>
                  <span className="quick-adjust-label">{timer.breakMinutes} 分钟休息</span>
                  <button className="quick-adjust-btn" onClick={() => timer.adjustBreakMinutes(1)} disabled={timer.breakMinutes >= 30}>+1</button>
                </div>
              )}

              <TimerControls isRunning={timer.isRunning} onStart={timer.start} onPause={timer.pause} onReset={timer.reset} onSkip={timer.skip} />

              {selectedTodo && !timer.pendingAssignment && (
                <div className="active-task-badge">
                  正在专注: {selectedTodo.title}
                  <span className="active-task-meta">{selectedTodo.category}</span>
                </div>
              )}

              <div className="today-summary">
                今日已完成 <strong>{todayPomodoros.length}</strong> 个番茄
                {stats.todayFocusMinutes > 0 && <> · {stats.todayFocusMinutes} 分钟</>}
              </div>
            </div>

            <TodoList
              todos={todos}
              selectedTodoId={selectedTodoId}
              onAdd={handleAddTodo}
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

      {/* Assignment modal */}
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
