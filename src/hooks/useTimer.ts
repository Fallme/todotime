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
  workMinutes: number;
  breakMinutes: number;
  pendingAssignment: PendingAssignment | null;
  taskFocusMode: boolean;
  taskFocusElapsed: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTotalTime: (seconds: number) => void;
  startTaskFocus: () => void;
  stopTaskFocus: () => void;
  assignPomodoro: (taskId: string | null, taskTitle: string, category: Category) => void;
  setOnComplete: (cb: (record: PomodoroRecord) => void) => void;
}

export function useTimer(workMinutesSetting: number, soundEnabled: boolean): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [workMinutes] = useState(workMinutesSetting);
  const [breakMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(workMinutesSetting * 60);
  const [totalTime, setTotalTimeState] = useState(workMinutesSetting * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);
  const [taskFocusMode, setTaskFocusMode] = useState(false);
  const [taskFocusElapsed, setTaskFocusElapsed] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');
  const onCompleteRef = useRef<((r: PomodoroRecord) => void) | null>(null);
  const taskFocusStartRef = useRef<string>('');
  const workMinRef = useRef(workMinutes);
  workMinRef.current = workMinutes;
  const breakMinRef = useRef(breakMinutes);
  breakMinRef.current = breakMinutes;
  const cycleRef = useRef(currentCycle);
  cycleRef.current = currentCycle;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const setOnComplete = useCallback((cb: (record: PomodoroRecord) => void) => {
    onCompleteRef.current = cb;
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const handleWorkEnd = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setPendingAssignment({ start: startTimeRef.current, duration: workMinRef.current });
    setCompletedPomodoros(p => p + 1);
    setCurrentCycle(c => c + 1);
    if (soundEnabled) playWorkComplete();
  }, [clearTimer, soundEnabled]);

  const switchToBreak = useCallback((long: boolean) => {
    setMode(long ? 'longBreak' : 'shortBreak');
    const dur = long ? 15 * 60 : breakMinRef.current * 60;
    setTimeLeft(dur);
    setTotalTimeState(dur);
    setIsRunning(false);
  }, []);

  const setTotalTime = useCallback((seconds: number) => {
    setTotalTimeState(seconds);
    setTimeLeft(seconds);
  }, []);

  // Work mode timer (countdown)
  useEffect(() => {
    if (!isRunning || mode !== 'work') return;
    if (!startTimeRef.current) startTimeRef.current = formatTime(new Date());
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleWorkEnd(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, handleWorkEnd, clearTimer]);

  // Break timer
  useEffect(() => {
    if (!isRunning || mode === 'work') return;
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          setMode('work');
          setTimeLeft(workMinRef.current * 60);
          setTotalTimeState(workMinRef.current * 60);
          if (soundEnabled) playBreakComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, soundEnabled, clearTimer]);

  // Task focus mode timer (unlimited, counts up)
  useEffect(() => {
    if (!taskFocusMode || !isRunning) return;
    if (!taskFocusStartRef.current) taskFocusStartRef.current = formatTime(new Date());
    intervalRef.current = window.setInterval(() => {
      setTaskFocusElapsed(prev => prev + 1);
    }, 1000);
    return clearTimer;
  }, [taskFocusMode, isRunning, clearTimer]);

  // Title
  useEffect(() => {
    if (taskFocusMode) {
      const m = Math.floor(taskFocusElapsed / 60);
      const s = taskFocusElapsed % 60;
      document.title = isRunning
        ? `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} - 任务专注`
        : '番茄钟';
    } else if (mode === 'work') {
      document.title = isRunning
        ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 番茄钟`
        : '番茄钟';
    } else {
      document.title = isRunning
        ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 休息中`
        : '番茄钟 - 休息';
    }
  }, [timeLeft, isRunning, mode, taskFocusMode, taskFocusElapsed]);

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
    const nextCycle = cycleRef.current + 1;
    if (nextCycle % 4 === 0) {
      switchToBreak(true);
    } else {
      switchToBreak(false);
    }
  }, [pendingAssignment, switchToBreak]);

  // Default focus: start countdown
  const start = useCallback(() => {
    setTaskFocusMode(false);
    setIsRunning(true);
  }, []);

  // Pause: JUST PAUSE. Don't reset anything.
  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimer();
    // Keep timeLeft as is - that's the whole point of pause
  }, [clearTimer]);

  // Reset: go back to full duration
  const reset = useCallback(() => {
    setIsRunning(false);
    clearTimer();
    setTimeLeft(workMinRef.current * 60);
    setTotalTimeState(workMinRef.current * 60);
    startTimeRef.current = '';
  }, [clearTimer]);

  const skip = useCallback(() => {
    if (taskFocusMode) {
      setTaskFocusMode(false);
      setIsRunning(false);
      clearTimer();
      const dur = Math.max(1, Math.floor(taskFocusElapsed / 60));
      setPendingAssignment({ start: taskFocusStartRef.current, duration: dur });
      setCompletedPomodoros(p => p + 1);
      taskFocusStartRef.current = '';
      if (soundEnabled) playWorkComplete();
      return;
    }
    if (mode === 'work') {
      handleWorkEnd();
    } else {
      clearTimer();
      setIsRunning(false);
      setMode('work');
      setTimeLeft(workMinRef.current * 60);
      setTotalTimeState(workMinRef.current * 60);
    }
  }, [taskFocusMode, mode, taskFocusElapsed, handleWorkEnd, clearTimer, soundEnabled]);

  const startTaskFocus = useCallback(() => {
    setTaskFocusMode(true);
    setTaskFocusElapsed(0);
    taskFocusStartRef.current = '';
    setIsRunning(true);
  }, []);

  const stopTaskFocus = useCallback(() => {
    setIsRunning(false);
    clearTimer();
    setTaskFocusMode(false);
    const dur = Math.max(1, Math.floor(taskFocusElapsed / 60));
    if (dur > 0) {
      setPendingAssignment({ start: taskFocusStartRef.current, duration: dur });
      setCompletedPomodoros(p => p + 1);
      taskFocusStartRef.current = '';
      if (soundEnabled) playWorkComplete();
    }
    setTaskFocusElapsed(0);
  }, [taskFocusElapsed, clearTimer, soundEnabled]);

  return {
    mode, timeLeft, totalTime, isRunning, currentCycle, completedPomodoros,
    workMinutes, breakMinutes, pendingAssignment,
    taskFocusMode, taskFocusElapsed,
    start, pause, reset, skip,
    setTotalTime, startTaskFocus, stopTaskFocus,
    assignPomodoro, setOnComplete,
  };
}
