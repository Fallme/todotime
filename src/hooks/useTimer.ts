import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, TimerSettings, PomodoroRecord, Category } from '../types';
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
  workMinutes: number;
  breakMinutes: number;
  pendingAssignment: PendingAssignment | null;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  adjustWorkMinutes: (delta: number) => void;
  adjustBreakMinutes: (delta: number) => void;
  assignPomodoro: (taskId: string | null, taskTitle: string, category: Category) => void;
  setOnComplete: (cb: (record: PomodoroRecord) => void) => void;
}

export function useTimer(settings: TimerSettings, soundEnabled: boolean): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [workMinutes, setWorkMinutes] = useState(settings.workMinutes);
  const [breakMinutes, setBreakMinutes] = useState(settings.shortBreakMinutes);
  const [timeLeft, setTimeLeft] = useState(settings.workMinutes * 60);
  const [totalTime, setTotalTime] = useState(settings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');
  const onCompleteRef = useRef<((r: PomodoroRecord) => void) | null>(null);
  const workMinRef = useRef(workMinutes);
  workMinRef.current = workMinutes;
  const breakMinRef = useRef(breakMinutes);
  breakMinRef.current = breakMinutes;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const setOnComplete = useCallback((cb: (record: PomodoroRecord) => void) => {
    onCompleteRef.current = cb;
  }, []);

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    const dur = newMode === 'work' ? workMinRef.current * 60
      : newMode === 'shortBreak' ? breakMinRef.current * 60
      : settingsRef.current.longBreakMinutes * 60;
    setTimeLeft(dur);
    setTotalTime(dur);
    setIsRunning(false);
    if (newMode === 'work') startTimeRef.current = '';
  }, []);

  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (mode === 'work') {
      setPendingAssignment({ start: startTimeRef.current, duration: workMinRef.current });
      setCompletedPomodoros(p => p + 1);
      setCurrentCycle(c => c + 1);
      if (soundEnabled) playWorkComplete();
    } else {
      if (soundEnabled) playBreakComplete();
      switchMode('work');
    }
  }, [mode, soundEnabled, switchMode]);

  const assignPomodoro = useCallback((taskId: string | null, taskTitle: string, category: Category) => {
    if (!pendingAssignment) return;
    const record: PomodoroRecord = {
      start: pendingAssignment.start,
      end: formatTime(new Date()),
      duration: pendingAssignment.duration,
      taskId, taskTitle: taskTitle || '未分类专注', category, completed: true,
    };
    onCompleteRef.current?.(record);
    setPendingAssignment(null);
    const nextCycle = currentCycle + 1;
    if (nextCycle % settingsRef.current.longBreakInterval === 0) {
      switchMode('longBreak');
    } else {
      switchMode('shortBreak');
    }
  }, [pendingAssignment, currentCycle, switchMode]);

  useEffect(() => {
    if (!isRunning) return;
    if (!startTimeRef.current) startTimeRef.current = formatTime(new Date());
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { handleTimerEnd(); return 0; } return prev - 1; });
    }, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isRunning, handleTimerEnd]);

  useEffect(() => {
    const prefix = mode === 'work' ? '' : '休息 - ';
    document.title = isRunning
      ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - ${prefix}番茄钟`
      : `番茄钟`;
  }, [timeLeft, isRunning, mode]);

  useEffect(() => {
    if (!isRunning && mode === 'work') {
      setTimeLeft(workMinutes * 60);
      setTotalTime(workMinutes * 60);
    }
  }, [workMinutes, isRunning, mode]);

  const adjustWorkMinutes = useCallback((d: number) => setWorkMinutes(p => Math.max(1, Math.min(90, p + d))), []);
  const adjustBreakMinutes = useCallback((d: number) => setBreakMinutes(p => Math.max(1, Math.min(30, p + d))), []);
  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    const dur = mode === 'work' ? workMinRef.current * 60 : breakMinRef.current * 60;
    setTimeLeft(dur); setTotalTime(dur); startTimeRef.current = '';
  }, [mode]);
  const skip = useCallback(() => handleTimerEnd(), [handleTimerEnd]);

  return {
    mode, timeLeft, totalTime, isRunning, currentCycle, completedPomodoros,
    workMinutes, breakMinutes, pendingAssignment,
    start, pause, reset, skip,
    adjustWorkMinutes, adjustBreakMinutes,
    assignPomodoro, setOnComplete,
  };
}
