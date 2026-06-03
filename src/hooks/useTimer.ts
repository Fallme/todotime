import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, PomodoroRecord, Category } from '../types';
import { formatTime, formatDate } from '../utils/dateUtils';
import { playWorkComplete, playBreakComplete, playStart } from '../utils/sound';

export interface PendingAssignment {
  start: string;
  duration: number;
}

export type GroupPhase = 'working' | 'settle';

interface UseTimerReturn {
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  cycleCount: number;
  totalPomodoros: number;
  todayPomodoros: PomodoroRecord[];
  pendingAssignments: PendingAssignment[];
  groupPhase: GroupPhase;
  toast: string | null;
  runningMinutes: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTotalTime: (seconds: number) => void;
  setTaskInfo: (id: string | null, title: string, category: Category) => void;
  assignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  startNextGroup: () => void;
  stop: () => void;
  endNow: () => void;
  resetCycle: () => void;
  addTestPomodoros: (records: PomodoroRecord[]) => void;
  setOnComplete: (cb: (record: PomodoroRecord) => void) => void;
}

export function useTimer(timerSettings: { workMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakInterval: number }, soundEnabled: boolean = true): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTimeState] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [todayPomodoros, setTodayPomodoros] = useState<PomodoroRecord[]>(() => {
    try {
      const storedDate = localStorage.getItem('todotime_today_date');
      const today = formatDate(new Date());
      if (storedDate === today) {
        const stored = localStorage.getItem('todotime_today_pomodoros');
        if (stored) return JSON.parse(stored) as PomodoroRecord[];
      }
    } catch { /* ignore */ }
    return [];
  });
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [groupPhase, setGroupPhase] = useState<GroupPhase>('working');
  const [toast, setToast] = useState<string | null>(null);
  const [runningMinutes, setRunningMinutes] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTimeRef = useRef(totalTime); totalTimeRef.current = totalTime;
  const timeLeftRef = useRef(timeLeft); timeLeftRef.current = timeLeft;
  const modeRef = useRef(mode); modeRef.current = mode;
  const currentTaskRef = useRef<{ id: string | null; title: string; category: Category } | null>(null);
  const cycleCountRef = useRef(cycleCount); cycleCountRef.current = cycleCount;
  const groupPhaseRef = useRef(groupPhase); groupPhaseRef.current = groupPhase;
  const pendingAssignRef = useRef(pendingAssignments); pendingAssignRef.current = pendingAssignments;
  const onCompleteRef = useRef<((r: PomodoroRecord) => void) | null>(null);
  const workMinutesRef = useRef(timerSettings.workMinutes); workMinutesRef.current = timerSettings.workMinutes;
  const shortBreakMinutesRef = useRef(timerSettings.shortBreakMinutes); shortBreakMinutesRef.current = timerSettings.shortBreakMinutes;
  const longBreakMinutesRef = useRef(timerSettings.longBreakMinutes); longBreakMinutesRef.current = timerSettings.longBreakMinutes;
  const cycleIntervalRef = useRef(timerSettings.longBreakInterval); cycleIntervalRef.current = timerSettings.longBreakInterval;
  const soundEnabledRef = useRef(soundEnabled); soundEnabledRef.current = soundEnabled;
  const isLongBreakRef = useRef(false);

  const clearTimer = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);
  const setTotalTime = useCallback((s: number) => { setTotalTimeState(s); setTimeLeft(s); }, []);
  const setTaskInfo = useCallback((id: string | null, title: string, category: Category) => { currentTaskRef.current = { id, title, category }; }, []);
  const setOnComplete = useCallback((cb: (r: PomodoroRecord) => void) => { onCompleteRef.current = cb; }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Record a pomodoro
  const recordPomodoro = useCallback((record: PomodoroRecord) => {
    setTodayPomodoros(prev => [...prev, record]);
    onCompleteRef.current?.(record);
  }, []);

  // Persist todayPomodoros to localStorage
  useEffect(() => {
    const today = formatDate(new Date());
    localStorage.setItem('todotime_today_date', today);
    localStorage.setItem('todotime_today_pomodoros', JSON.stringify(todayPomodoros));
  }, [todayPomodoros]);

  // Start break then auto-continue
  const startBreak = useCallback((isLong: boolean) => {
    if (isLong) {
      setMode('longBreak'); setTimeLeft(longBreakMinutesRef.current * 60); setTotalTimeState(longBreakMinutesRef.current * 60);
    } else {
      setMode('shortBreak'); setTimeLeft(shortBreakMinutesRef.current * 60); setTotalTimeState(shortBreakMinutesRef.current * 60);
    }
    setIsRunning(true);
  }, []);

  // Break countdown → after break, auto-continue to next work or settle
  useEffect(() => {
    if (!isRunning || mode === 'work') return;
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          if (soundEnabledRef.current) playBreakComplete();
          // Long break completed → merge all into one pomodoro and show modal
          if (isLongBreakRef.current) {
            isLongBreakRef.current = false;
            setTimeout(() => {
              const pending = pendingAssignRef.current;
              const totalMinutes = pending.reduce((sum, p) => sum + p.duration, 0);
              setCycleCount(0);
              setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
              setIsRunning(false);
              if (totalMinutes > 0) {
                setPendingAssignments([{ start: pending[0]?.start || formatTime(new Date()), duration: totalMinutes }]);
                setGroupPhase('settle');
              } else {
                showToast('一轮完成！');
              }
            }, 0);
            return 0;
          }
          // Short break → auto-start next work
          setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
          startTimeRef.current = '';
          setIsRunning(true);
          return workMinutesRef.current * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, clearTimer, recordPomodoro, showToast]);

  // Complete one work pomodoro
  const completeOne = useCallback((force = false) => {
    clearTimer();
    setIsRunning(false);
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = Math.round(elapsedSeconds / 60);
    const startTime = startTimeRef.current || formatTime(new Date());
    startTimeRef.current = '';

    if (!force && elapsedSeconds < 60) {
      setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
      return;
    }

    if (soundEnabledRef.current) playWorkComplete();

    // Add to pending assignments
    setPendingAssignments(prev => [...prev, { start: startTime, duration: Math.max(1, elapsed) }]);

    // Only count as pomodoro if >= 20 minutes
    if (elapsed >= 20) {
      setTotalPomodoros(p => p + 1);
      const nextDot = cycleCountRef.current + 1;
      setCycleCount(nextDot);

      if (nextDot >= cycleIntervalRef.current) {
        setCycleCount(0);
        isLongBreakRef.current = true;
        startBreak(true);
      } else {
        isLongBreakRef.current = false;
        startBreak(false);
      }
    } else {
      // Less than 20 min, just go to break without counting
      isLongBreakRef.current = false;
      startBreak(false);
    }
  }, [clearTimer, startBreak]);

  // Work countdown — tracks running minutes
  const workSecondsRef = useRef(0);
  useEffect(() => {
    if (!isRunning || mode !== 'work') {
      if (mode !== 'work') setRunningMinutes(0);
      workSecondsRef.current = 0;
      return;
    }
    if (!startTimeRef.current) startTimeRef.current = formatTime(new Date());
    workSecondsRef.current = totalTimeRef.current - timeLeftRef.current;
    setRunningMinutes(Math.floor(workSecondsRef.current / 60));
    intervalRef.current = window.setInterval(() => {
      workSecondsRef.current++;
      if (workSecondsRef.current % 60 === 0) {
        setRunningMinutes(Math.floor(workSecondsRef.current / 60));
      }
      setTimeLeft(prev => { if (prev <= 1) { completeOne(); return 0; } return prev - 1; });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, clearTimer, completeOne]);

  // Title
  useEffect(() => {
    if (mode === 'work') {
      document.title = isRunning ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 番茄钟` : '番茄钟';
    } else {
      document.title = isRunning ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 休息` : '番茄钟';
    }
  }, [timeLeft, isRunning, mode]);

  // Assign all pending from modal
  const assignAll = useCallback((results: { taskId: string | null; taskTitle: string; category: Category }[]) => {
    const pending = pendingAssignRef.current;
    pending.forEach((pa, i) => {
      const a = results[i] || results[results.length - 1];
      recordPomodoro({
        start: pa.start, end: formatTime(new Date()), duration: pa.duration,
        taskId: a.taskId, taskTitle: a.taskTitle || '未分配', category: a.category || '其他',
        completed: true, createdAt: formatTime(new Date()),
      });
    });
    setPendingAssignments([]);
    setGroupPhase('working');
    showToast(`已分配 ${pending.length} 个番茄`);
  }, [recordPomodoro, showToast]);

  // Start next group
  const startNextGroup = useCallback(() => {
    setGroupPhase('working');
    setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
    setIsRunning(true); startTimeRef.current = '';
  }, []);

  // Stop
  const stop = useCallback(() => {
    setGroupPhase('working');
    clearTimer(); setIsRunning(false);
    setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
    setCycleCount(0); startTimeRef.current = '';
    isLongBreakRef.current = false;
    setPendingAssignments([]);
    setRunningMinutes(0);
  }, [clearTimer]);

  // End now: settle completed pomodoros, update cycle
  const endNow = useCallback(() => {
    clearTimer();
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = Math.round(elapsedSeconds / 60);
    const startTime = startTimeRef.current || formatTime(new Date());
    startTimeRef.current = '';

    // Calculate total pending minutes
    const oldPending = pendingAssignRef.current;
    const oldMinutes = oldPending.reduce((sum, p) => sum + p.duration, 0);
    const currentMinute = elapsedSeconds >= 60 ? elapsed : 0;
    const totalMinutes = oldMinutes + currentMinute;

    setIsRunning(false);
    setRunningMinutes(0);
    setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
    isLongBreakRef.current = false;

    // Check if current work is ≥20 min (counts as pomodoro)
    const currentIsPomodoro = currentMinute >= 20;
    if (currentIsPomodoro) {
      setCycleCount(cycleCountRef.current + 1);
    }

    // Settle if there are completed pomodoros (from pending or current)
    const completedPomodoros = cycleCountRef.current + (currentIsPomodoro ? 1 : 0);
    if (completedPomodoros > 0 && totalMinutes > 0) {
      setPendingAssignments([{ start: startTime, duration: totalMinutes }]);
      setGroupPhase('settle');
    } else {
      // No completed pomodoros, just reset
      setCycleCount(0);
      setGroupPhase('working');
    }
  }, [clearTimer]);

  const resetCycle = useCallback(() => {
    setCycleCount(0); setGroupPhase('working'); setPendingAssignments([]);
    isLongBreakRef.current = false;
  }, []);

  const addTestPomodoros = useCallback((records: PomodoroRecord[]) => {
    setTodayPomodoros(prev => [...prev, ...records]);
    setTotalPomodoros(p => p + records.length);
  }, []);

  const start = useCallback(() => {
    setGroupPhase('working');
    setIsRunning(true);
    if (soundEnabledRef.current) playStart();
  }, []);

  const pause = useCallback(() => {
    // Immediately update runningMinutes to reflect current elapsed
    if (modeRef.current === 'work') {
      const elapsed = totalTimeRef.current - timeLeftRef.current;
      setRunningMinutes(Math.floor(elapsed / 60));
    }
    setIsRunning(false); clearTimer();
  }, [clearTimer]);
  const reset = useCallback(() => { endNow(); }, [endNow]);

  // Skip: quickly complete current phase and move to next (keeps running)
  const skip = useCallback(() => {
    clearTimer();
    if (modeRef.current === 'work') {
      // Skip work → always count as pomodoro, go to break
      const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
      const elapsed = Math.round(elapsedSeconds / 60);
      const startTime = startTimeRef.current || formatTime(new Date());
      startTimeRef.current = '';

      if (soundEnabledRef.current) playWorkComplete();
      setTotalPomodoros(p => p + 1);

      // Only record time if >= 1 minute
      if (elapsedSeconds >= 60) {
        setPendingAssignments(prev => [...prev, { start: startTime, duration: elapsed }]);
      }

      const nextDot = cycleCountRef.current + 1;
      setCycleCount(nextDot);

      if (nextDot >= cycleIntervalRef.current) {
        setCycleCount(0);
        isLongBreakRef.current = true;
        startBreak(true);
      } else {
        isLongBreakRef.current = false;
        startBreak(false);
      }
    } else {
      // Skip break → go to work (keep running)
      setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
      startTimeRef.current = '';
      setIsRunning(true);
    }
  }, [clearTimer, startBreak]);

  return {
    mode, timeLeft, totalTime, isRunning, cycleCount, totalPomodoros, todayPomodoros,
    pendingAssignments, groupPhase, toast, runningMinutes,
    start, pause, reset, skip, setTotalTime, setTaskInfo,
    assignAll, startNextGroup, stop, endNow, resetCycle, addTestPomodoros, setOnComplete,
  };
}
