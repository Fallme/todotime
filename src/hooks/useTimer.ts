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
  currentCycle: number;
  completedPomodoros: number;
  pendingAssignment: PendingAssignment | null;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTotalTime: (seconds: number) => void;
  setTaskInfo: (id: string | null, title: string, category: Category) => void;
  assignPomodoro: (taskId: string | null, taskTitle: string, category: Category) => void;
  setOnComplete: (cb: (record: PomodoroRecord) => void) => void;
}

export function useTimer(): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTimeState] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');
  const onCompleteRef = useRef<((r: PomodoroRecord) => void) | null>(null);
  const cycleRef = useRef(currentCycle);
  cycleRef.current = currentCycle;
  const totalTimeRef = useRef(totalTime);
  totalTimeRef.current = totalTime;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Current task info for auto-assignment
  const currentTaskRef = useRef<{ id: string | null; title: string; category: Category } | null>(null);

  const setOnComplete = useCallback((cb: (record: PomodoroRecord) => void) => {
    onCompleteRef.current = cb;
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const setTotalTime = useCallback((seconds: number) => {
    setTotalTimeState(seconds);
    setTimeLeft(seconds);
  }, []);

  const setTaskInfo = useCallback((id: string | null, title: string, category: Category) => {
    currentTaskRef.current = { id, title, category };
  }, []);

  // Start break automatically
  const startBreak = useCallback(() => {
    const nextCycle = cycleRef.current + 1;
    if (nextCycle % 4 === 0) {
      setMode('longBreak'); setTimeLeft(15 * 60); setTotalTimeState(15 * 60);
    } else {
      setMode('shortBreak'); setTimeLeft(5 * 60); setTotalTimeState(5 * 60);
    }
    setIsRunning(true); // Auto-start break
  }, []);

  // Complete work phase: either auto-assign or show modal
  const completeWork = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    const duration = Math.round(totalTimeRef.current / 60);
    const task = currentTaskRef.current;
    setCompletedPomodoros(p => p + 1);
    setCurrentCycle(c => c + 1);
    playWorkComplete();

    if (task) {
      // Task already selected → auto-assign, no modal
      const record: PomodoroRecord = {
        start: startTimeRef.current, end: formatTime(new Date()),
        duration, taskId: task.id, taskTitle: task.title || '未分类专注',
        category: task.category, completed: true,
      };
      onCompleteRef.current?.(record);
      startBreak();
    } else {
      // No task → show assignment modal
      setPendingAssignment({ start: startTimeRef.current, duration });
    }
    startTimeRef.current = '';
  }, [clearTimer, startBreak]);

  // Work countdown
  useEffect(() => {
    if (!isRunning || mode !== 'work') return;
    if (!startTimeRef.current) startTimeRef.current = formatTime(new Date());
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { completeWork(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, clearTimer, completeWork]);

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
      document.title = isRunning
        ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 番茄钟`
        : '番茄钟';
    } else {
      document.title = isRunning
        ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 休息`
        : '番茄钟';
    }
  }, [timeLeft, isRunning, mode]);

  // Manual assign (from modal, for unassigned pomodoros)
  const assignPomodoro = useCallback((taskId: string | null, taskTitle: string, category: Category) => {
    if (!pendingAssignment) return;
    const record: PomodoroRecord = {
      start: pendingAssignment.start, end: formatTime(new Date()),
      duration: pendingAssignment.duration,
      taskId, taskTitle: taskTitle || '未分类专注', category, completed: true,
    };
    onCompleteRef.current?.(record);
    setPendingAssignment(null);
    startBreak();
  }, [pendingAssignment, startBreak]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => { setIsRunning(false); clearTimer(); }, [clearTimer]);
  const reset = useCallback(() => {
    setIsRunning(false); clearTimer();
    setTimeLeft(totalTimeRef.current || 25 * 60);
    setTotalTimeState(totalTimeRef.current || 25 * 60);
    startTimeRef.current = '';
  }, [clearTimer]);
  // Skip = immediately complete current phase
  const skip = useCallback(() => {
    if (mode === 'work') {
      completeWork();
    } else {
      clearTimer(); setIsRunning(false);
      setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
      startTimeRef.current = '';
    }
  }, [mode, clearTimer, completeWork]);

  return {
    mode, timeLeft, totalTime, isRunning, currentCycle, completedPomodoros, pendingAssignment,
    start, pause, reset, skip, setTotalTime, setTaskInfo, assignPomodoro, setOnComplete,
  };
}
