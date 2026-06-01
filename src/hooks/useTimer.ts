import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, PomodoroRecord, Category } from '../types';
import { formatTime } from '../utils/dateUtils';
import { playWorkComplete, playBreakComplete } from '../utils/sound';

export interface PendingAssignment {
  start: string;
  duration: number;
}

interface UseTimerReturn {
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  cycleCount: number;          // 0-3, dots filled this cycle
  totalPomodoros: number;      // lifetime count
  pendingAssignments: PendingAssignment[];
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTotalTime: (seconds: number) => void;
  setTaskInfo: (id: string | null, title: string, category: Category) => void;
  assignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  setOnComplete: (cb: (record: PomodoroRecord) => void) => void;
}

export function useTimer(): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTimeState] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);       // 0-3 dots
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');
  const onCompleteRef = useRef<((r: PomodoroRecord) => void) | null>(null);
  const cycleCountRef = useRef(cycleCount);
  cycleCountRef.current = cycleCount;
  const totalTimeRef = useRef(totalTime);
  totalTimeRef.current = totalTime;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const currentTaskRef = useRef<{ id: string | null; title: string; category: Category } | null>(null);

  const setOnComplete = useCallback((cb: (record: PomodoroRecord) => void) => { onCompleteRef.current = cb; }, []);
  const clearTimer = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);
  const setTotalTime = useCallback((s: number) => { setTotalTimeState(s); setTimeLeft(s); }, []);
  const setTaskInfo = useCallback((id: string | null, title: string, category: Category) => { currentTaskRef.current = { id, title, category }; }, []);

  // Start break after cycle complete (4 dots filled)
  const startBreak = useCallback((long: boolean) => {
    if (long) {
      setMode('longBreak'); setTimeLeft(15 * 60); setTotalTimeState(15 * 60);
    } else {
      setMode('shortBreak'); setTimeLeft(5 * 60); setTotalTimeState(5 * 60);
    }
    setIsRunning(true);
  }, []);

  // Complete one work pomodoro
  const completeOneWork = useCallback((interrupted = false) => {
    clearTimer();
    setIsRunning(false);

    const elapsed = interrupted
      ? Math.max(1, Math.round((totalTimeRef.current - timeLeftRef.current) / 60))
      : Math.round(totalTimeRef.current / 60);

    const task = currentTaskRef.current;
    const nextCycleDot = interrupted ? cycleCountRef.current : cycleCountRef.current + 1;

    // Play sound
    if (!interrupted) playWorkComplete();

    startTimeRef.current = '';

    if (task) {
      // Task selected → auto-record immediately
      const record: PomodoroRecord = {
        start: '', end: formatTime(new Date()),
        duration: elapsed, taskId: task.id, taskTitle: task.title,
        category: task.category, completed: !interrupted,
      };
      onCompleteRef.current?.(record);
    } else {
      // No task → accumulate for batch assignment
      setPendingAssignments(prev => [...prev, { start: '', duration: elapsed }]);
    }

    if (!interrupted) {
      setTotalPomodoros(p => p + 1);
      setCycleCount(nextCycleDot);
    }

    // After 4 dots: cycle complete → break
    if (nextCycleDot >= 4 && !interrupted) {
      setCycleCount(0);  // reset for next cycle
      const isLong = true; // 4 done = long break
      startBreak(isLong);
    } else if (!interrupted) {
      startBreak(false); // short break between pomodoros
    }
  }, [clearTimer, startBreak]);

  // Work countdown
  useEffect(() => {
    if (!isRunning || mode !== 'work') return;
    if (!startTimeRef.current) startTimeRef.current = formatTime(new Date());
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { completeOneWork(false); return 0; } return prev - 1; });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, clearTimer, completeOneWork]);

  // Break countdown
  useEffect(() => {
    if (!isRunning || mode === 'work') return;
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer(); setIsRunning(false);
          setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
          startTimeRef.current = '';
          playBreakComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, clearTimer]);

  // Title
  useEffect(() => {
    if (mode === 'work') {
      document.title = isRunning ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 番茄钟` : '番茄钟';
    } else {
      document.title = isRunning ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 休息` : '番茄钟';
    }
  }, [timeLeft, isRunning, mode]);

  // Batch assign
  const assignAll = useCallback((results: { taskId: string | null; taskTitle: string; category: Category }[]) => {
    pendingAssignments.forEach((pa, i) => {
      const a = results[i] || results[results.length - 1];
      onCompleteRef.current?.({
        start: pa.start, end: formatTime(new Date()), duration: pa.duration,
        taskId: a.taskId, taskTitle: a.taskTitle || '未分类专注', category: a.category, completed: true,
      });
    });
    setPendingAssignments([]);
  }, [pendingAssignments]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => { setIsRunning(false); clearTimer(); }, [clearTimer]);
  const reset = useCallback(() => {
    setIsRunning(false); clearTimer();
    setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    startTimeRef.current = '';
  }, [clearTimer]);
  const skip = useCallback(() => {
    if (mode === 'work') { completeOneWork(true); }
    else {
      clearTimer(); setIsRunning(false);
      setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
      startTimeRef.current = '';
    }
  }, [mode, clearTimer, completeOneWork]);

  return {
    mode, timeLeft, totalTime, isRunning, cycleCount, totalPomodoros, pendingAssignments,
    start, pause, reset, skip, setTotalTime, setTaskInfo, assignAll, setOnComplete,
  };
}
