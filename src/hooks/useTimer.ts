import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, PomodoroRecord, Category } from '../types';
import { formatTime } from '../utils/dateUtils';
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

export function useTimer(): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTimeState] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [todayPomodoros, setTodayPomodoros] = useState<PomodoroRecord[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [groupPhase, setGroupPhase] = useState<GroupPhase>('working');
  const [toast, setToast] = useState<string | null>(null);

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

  // Settle: assign pending pomodoros to task or show modal
  const settlePending = useCallback((taskInfo: { id: string | null; title: string; category: Category } | null) => {
    const pending = pendingAssignRef.current;
    if (pending.length === 0) return;

    if (taskInfo) {
      // Auto-assign all to task
      pending.forEach(pa => {
        recordPomodoro({
          start: pa.start, end: formatTime(new Date()), duration: pa.duration,
          taskId: taskInfo.id, taskTitle: taskInfo.title, category: taskInfo.category,
          completed: true, createdAt: formatTime(new Date()),
        });
      });
      setPendingAssignments([]);
      showToast(`🍅 已结算 ${pending.length} 个番茄 → 「${taskInfo.title}」`);
    } else {
      // No task → show assignment modal
      setGroupPhase('settle');
    }
  }, [recordPomodoro, showToast]);

  // Start break then auto-continue
  const startBreak = useCallback((isLong: boolean) => {
    if (isLong) {
      setMode('longBreak'); setTimeLeft(15 * 60); setTotalTimeState(15 * 60);
    } else {
      setMode('shortBreak'); setTimeLeft(5 * 60); setTotalTimeState(5 * 60);
    }
    setIsRunning(true);
  }, []);

  // Break countdown → after break, settle or continue
  useEffect(() => {
    if (!isRunning || mode === 'work') return;
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          playBreakComplete();
          setIsRunning(false);
          // After break: settle pending
          settlePending(currentTaskRef.current);
          setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
          startTimeRef.current = '';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, clearTimer, settlePending]);

  // Complete one work pomodoro
  const completeOne = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = Math.round(elapsedSeconds / 60);
    startTimeRef.current = '';

    if (elapsedSeconds < 60) {
      setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
      return;
    }

    playWorkComplete();
    setTotalPomodoros(p => p + 1);
    const nextDot = cycleCountRef.current + 1;
    setCycleCount(nextDot);

    // Add to pending (will be settled after break or on endNow)
    setPendingAssignments(prev => [...prev, { start: '', duration: elapsed }]);

    if (nextDot >= 4) {
      setCycleCount(0);
      // 4 pomodoros done → long break, then settle
      startBreak(true);
    } else {
      // Short break, then continue
      startBreak(false);
    }
  }, [clearTimer, startBreak]);

  // Work countdown
  useEffect(() => {
    if (!isRunning || mode !== 'work') return;
    if (!startTimeRef.current) startTimeRef.current = formatTime(new Date());
    intervalRef.current = window.setInterval(() => {
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
    showToast(`🍅 已分配 ${pending.length} 个番茄`);
  }, [recordPomodoro, showToast]);

  // Start next group
  const startNextGroup = useCallback(() => {
    setGroupPhase('working');
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    setIsRunning(true); startTimeRef.current = '';
  }, []);

  // Stop
  const stop = useCallback(() => {
    setGroupPhase('working');
    clearTimer(); setIsRunning(false);
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    setCycleCount(0); startTimeRef.current = '';
    setPendingAssignments([]);
  }, [clearTimer]);

  // End now: if ≥1 pomodoro, settle; then reset
  const endNow = useCallback(() => {
    clearTimer();
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = Math.round(elapsedSeconds / 60);
    startTimeRef.current = '';

    // Record current work if ≥60s
    if (mode === 'work' && elapsedSeconds >= 60) {
      setPendingAssignments(prev => [...prev, { start: '', duration: elapsed }]);
      playWorkComplete();
    }

    setIsRunning(false);

    // Settle if at least 1 pomodoro exists
    const pending = [...pendingAssignRef.current];
    if (pending.length > 0) {
      const task = currentTaskRef.current;
      if (task) {
        pending.forEach(pa => {
          recordPomodoro({
            start: pa.start, end: formatTime(new Date()), duration: pa.duration,
            taskId: task.id, taskTitle: task.title, category: task.category,
            completed: true, createdAt: formatTime(new Date()),
          });
        });
        setPendingAssignments([]);
        showToast(`🍅 已结算 ${pending.length} 个番茄 → 「${task.title}」`);
      } else {
        setGroupPhase('settle');
      }
    }

    // Reset
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    setCycleCount(0);
    if (pending.length === 0) setGroupPhase('working');
  }, [clearTimer, mode, recordPomodoro, showToast]);

  const resetCycle = useCallback(() => {
    setCycleCount(0); setGroupPhase('working'); setPendingAssignments([]);
  }, []);

  const addTestPomodoros = useCallback((records: PomodoroRecord[]) => {
    setTodayPomodoros(prev => [...prev, ...records]);
    setTotalPomodoros(p => p + records.length);
  }, []);

  const start = useCallback(() => {
    setGroupPhase('working');
    setIsRunning(true);
    playStart();
  }, []);

  const pause = useCallback(() => { setIsRunning(false); clearTimer(); }, [clearTimer]);
  const reset = useCallback(() => { endNow(); }, [endNow]);

  // Skip: same as completeOne for work, or skip break
  const skip = useCallback(() => {
    if (mode === 'work') { completeOne(); }
    else {
      clearTimer(); setIsRunning(false);
      settlePending(currentTaskRef.current);
      setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
      startTimeRef.current = '';
    }
  }, [mode, clearTimer, completeOne, settlePending]);

  return {
    mode, timeLeft, totalTime, isRunning, cycleCount, totalPomodoros, todayPomodoros,
    pendingAssignments, groupPhase, toast,
    start, pause, reset, skip, setTotalTime, setTaskInfo,
    assignAll, startNextGroup, stop, endNow, resetCycle, addTestPomodoros, setOnComplete,
  };
}
