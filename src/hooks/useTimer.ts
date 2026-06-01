import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, PomodoroRecord, Category } from '../types';
import { formatTime } from '../utils/dateUtils';
import { playWorkComplete, playBreakComplete } from '../utils/sound';

export interface PendingAssignment {
  start: string;
  duration: number;
}

export type GroupPhase = 'working' | 'groupDone';

interface UseTimerReturn {
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  cycleCount: number;
  totalPomodoros: number;
  pendingAssignments: PendingAssignment[];
  groupPhase: GroupPhase;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTotalTime: (seconds: number) => void;
  setTaskInfo: (id: string | null, title: string, category: Category) => void;
  assignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  startNextGroup: () => void;
  setOnComplete: (cb: (record: PomodoroRecord) => void) => void;
}

export function useTimer(): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTimeState] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [groupPhase, setGroupPhase] = useState<GroupPhase>('working');

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
  const groupPhaseRef = useRef(groupPhase);
  groupPhaseRef.current = groupPhase;

  const setOnComplete = useCallback((cb: (record: PomodoroRecord) => void) => { onCompleteRef.current = cb; }, []);
  const clearTimer = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);
  const setTotalTime = useCallback((s: number) => { setTotalTimeState(s); setTimeLeft(s); }, []);
  const setTaskInfo = useCallback((id: string | null, title: string, category: Category) => { currentTaskRef.current = { id, title, category }; }, []);

  // Start break then auto-continue
  const startBreakAndContinue = useCallback(() => {
    const nextDot = cycleCountRef.current;
    const isLongBreak = nextDot >= 4;
    if (isLongBreak) {
      setMode('longBreak'); setTimeLeft(15 * 60); setTotalTimeState(15 * 60);
    } else {
      setMode('shortBreak'); setTimeLeft(5 * 60); setTotalTimeState(5 * 60);
    }
    setIsRunning(true);
  }, []);

  // Complete one pomodoro (skip or timer end)
  const completeOne = useCallback(() => {
    clearTimer();
    setIsRunning(false);

    const elapsed = Math.max(1, Math.round((totalTimeRef.current - timeLeftRef.current) / 60));
    const task = currentTaskRef.current;
    const nextDot = cycleCountRef.current + 1;

    playWorkComplete();
    startTimeRef.current = '';

    if (task) {
      onCompleteRef.current?.({
        start: '', end: formatTime(new Date()), duration: elapsed,
        taskId: task.id, taskTitle: task.title, category: task.category, completed: true,
      });
    } else {
      setPendingAssignments(prev => [...prev, { start: '', duration: elapsed }]);
    }

    setTotalPomodoros(p => p + 1);
    setCycleCount(nextDot);

    // Group complete (4 dots)
    if (nextDot >= 4) {
      setCycleCount(0);
      setGroupPhase('groupDone');
      setIsRunning(false);
      // Don't auto-continue → show assignment modal
    } else {
      // Still in group → short break then auto-continue
      startBreakAndContinue();
    }
  }, [clearTimer, startBreakAndContinue]);

  // Work countdown
  useEffect(() => {
    if (!isRunning || mode !== 'work') return;
    if (!startTimeRef.current) startTimeRef.current = formatTime(new Date());
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { completeOne(); return 0; } return prev - 1; });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, clearTimer, completeOne]);

  // Break countdown → auto start next work
  useEffect(() => {
    if (!isRunning || mode === 'work') return;
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          playBreakComplete();
          // Auto-start next work session
          if (groupPhaseRef.current !== 'groupDone') {
            setTimeout(() => {
              setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
              setIsRunning(true); startTimeRef.current = '';
            }, 500);
          } else {
            setIsRunning(false);
          }
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
        taskId: a.taskId, taskTitle: a.taskTitle || '未分配', category: a.category || '其他', completed: true,
      });
    });
    setPendingAssignments([]);
  }, [pendingAssignments]);

  // Start next group
  const startNextGroup = useCallback(() => {
    setGroupPhase('working');
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    setIsRunning(true); startTimeRef.current = '';
  }, []);

  // Stop: assign pending, reset to idle
  const stop = useCallback(() => {
    setGroupPhase('working');
    clearTimer();
    setIsRunning(false);
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    setCycleCount(0);
    startTimeRef.current = '';
  }, [clearTimer]);

  const start = useCallback(() => {
    setGroupPhase('working');
    setIsRunning(true);
  }, []);
  const pause = useCallback(() => { setIsRunning(false); clearTimer(); }, [clearTimer]);
  const reset = useCallback(() => {
    setIsRunning(false); clearTimer();
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    startTimeRef.current = '';
  }, [clearTimer]);
  // Skip = complete immediately (counts as a tomato!)
  const skip = useCallback(() => {
    if (mode === 'work') { completeOne(); }
    else {
      clearTimer(); setIsRunning(false);
      setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
      startTimeRef.current = '';
    }
  }, [mode, clearTimer, completeOne]);

  return {
    mode, timeLeft, totalTime, isRunning, cycleCount, totalPomodoros,
    pendingAssignments, groupPhase,
    start, pause, reset, skip, setTotalTime, setTaskInfo,
    assignAll, startNextGroup, stop, setOnComplete,
  };
}
