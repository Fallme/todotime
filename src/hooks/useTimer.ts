import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, PomodoroRecord, Category } from '../types';
import { formatDate, generateId } from '../utils/dateUtils';
import { getDeviceId, profileStorageKey, readProfileStorage } from '../utils/syncIdentity';
import { completedMinutes, countsAsPomodoro, getNextCycle, MIN_FOCUS_RECORD_MINUTES, MIN_POMODORO_MINUTES, shouldRecordFocus } from '../utils/pomodoroRules';
import { initAudio, playStart, playEnterBreak, playCycleComplete, playPause, playResume, playEnd } from '../utils/sound';
import { mergeImportedPomodoros, normalizeImportedPomodoros } from '../utils/backup';

export interface PendingAssignment {
  id: string;
  start: string;
  end: string;
  date: string;
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
  startWork: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  skipRound: () => void;
  setTotalTime: (seconds: number) => void;
  setTaskInfo: (id: string | null, title: string, category: Category) => void;
  assignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  skipAssignments: () => void;
  startNextGroup: () => void;
  stop: () => void;
  endNow: () => void;
  resetCycle: () => void;
  importPomodoros: (records: unknown) => void;
  addManualPomodoro: (record: PomodoroRecord) => void;
  setOnComplete: (cb: (record: PomodoroRecord) => void) => void;
}

export function useTimer(timerSettings: { workMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakInterval: number }, soundEnabled: boolean = true, onRecorded?: (record: PomodoroRecord) => void, profileId: string = 'local'): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(timerSettings.workMinutes * 60);
  const [totalTime, setTotalTimeState] = useState(timerSettings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [todayPomodoros, setTodayPomodoros] = useState<PomodoroRecord[]>(() => {
    try {
      const storedDate = readProfileStorage('todotime_today_date', profileId);
      const today = formatDate(new Date());
      if (storedDate === today) {
        const stored = readProfileStorage('todotime_today_pomodoros', profileId);
        if (stored) {
          return normalizeImportedPomodoros(JSON.parse(stored));
        }
      }
    } catch { /* ignore */ }
    return [];
  });
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [groupPhase, setGroupPhase] = useState<GroupPhase>('working');
  const [toast, setToast] = useState<string | null>(null);
  const [runningMinutes, setRunningMinutes] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTimeRef = useRef(totalTime);
  const timeLeftRef = useRef(timeLeft);
  const modeRef = useRef(mode);
  const currentTaskRef = useRef<{ id: string | null; title: string; category: Category } | null>(null);
  const cycleCountRef = useRef(cycleCount);
  const groupPhaseRef = useRef(groupPhase);
  const pendingAssignRef = useRef(pendingAssignments);
  const onCompleteRef = useRef<((r: PomodoroRecord) => void) | null>(null);
  const workMinutesRef = useRef(timerSettings.workMinutes);
  const shortBreakMinutesRef = useRef(timerSettings.shortBreakMinutes);
  const longBreakMinutesRef = useRef(timerSettings.longBreakMinutes);
  const cycleIntervalRef = useRef(timerSettings.longBreakInterval);
  const soundEnabledRef = useRef(soundEnabled);
  const isLongBreakRef = useRef(false);
  const profileIdRef = useRef(profileId);
  const lastCheckpointMinuteRef = useRef(0);
  const resumeAfterSettleRef = useRef(false);
  const deviceIdRef = useRef(getDeviceId());

  const clearTimer = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);

  useEffect(() => { totalTimeRef.current = totalTime; }, [totalTime]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { cycleCountRef.current = cycleCount; }, [cycleCount]);
  useEffect(() => { groupPhaseRef.current = groupPhase; }, [groupPhase]);
  useEffect(() => { pendingAssignRef.current = pendingAssignments; }, [pendingAssignments]);
  useEffect(() => { workMinutesRef.current = timerSettings.workMinutes; }, [timerSettings.workMinutes]);
  useEffect(() => { shortBreakMinutesRef.current = timerSettings.shortBreakMinutes; }, [timerSettings.shortBreakMinutes]);
  useEffect(() => { longBreakMinutesRef.current = timerSettings.longBreakMinutes; }, [timerSettings.longBreakMinutes]);
  useEffect(() => { cycleIntervalRef.current = timerSettings.longBreakInterval; }, [timerSettings.longBreakInterval]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

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
    const normalized = { ...record, id: record.id || generateId(), date: record.date || formatDate(new Date()) };
    setTodayPomodoros(prev => {
      const index = prev.findIndex(item => item.id === normalized.id);
      if (index < 0) return [...prev, normalized];
      const next = [...prev];
      next[index] = normalized;
      return next;
    });
    // Use direct callback if available, fallback to ref
    if (onRecorded) {
      onRecorded(normalized);
    } else {
      onCompleteRef.current?.(normalized);
    }
  }, [onRecorded]);

  const addManualPomodoro = useCallback((record: PomodoroRecord) => {
    const normalized = {
      ...record,
      id: record.id || `manual-${deviceIdRef.current}-${generateId()}`,
      manual: true,
      completed: true,
      countsAsPomodoro: countsAsPomodoro(record.duration),
    };
    recordPomodoro(normalized);
    if (normalized.countsAsPomodoro) setTotalPomodoros(count => count + 1);
    showToast(normalized.countsAsPomodoro
      ? `已补录 ${normalized.duration} 分钟 · 1 个番茄`
      : `已补录 ${normalized.duration} 分钟；未满 ${MIN_POMODORO_MINUTES} 分钟不计番茄`);
  }, [recordPomodoro, showToast]);

  // Persist todayPomodoros to localStorage
  useEffect(() => {
    const today = formatDate(new Date());
    localStorage.setItem(profileStorageKey('todotime_today_date', profileIdRef.current), today);
    localStorage.setItem(profileStorageKey('todotime_today_pomodoros', profileIdRef.current), JSON.stringify(todayPomodoros));
  }, [todayPomodoros, profileId]);

  const playSound = useCallback((fn: () => void) => {
    if (soundEnabledRef.current) {
      // Initialize inside the initiating click so the very first start cue is audible.
      initAudio();
      fn();
    }
  }, []);

  // Start break then auto-continue
  const startBreak = useCallback((isLong: boolean) => {
    if (isLong) {
      setMode('longBreak'); setTimeLeft(longBreakMinutesRef.current * 60); setTotalTimeState(longBreakMinutesRef.current * 60);
    } else {
      setMode('shortBreak'); setTimeLeft(shortBreakMinutesRef.current * 60); setTotalTimeState(shortBreakMinutesRef.current * 60);
    }
    playSound(playEnterBreak);
    setIsRunning(true);
  }, [playSound]);

  // Group progress is independent from the tomato count: skipped work also consumes a slot.
  const advanceCycle = useCallback(() => {
    const progress = getNextCycle(cycleCountRef.current, cycleIntervalRef.current);
    cycleCountRef.current = progress.nextCycle;
    setCycleCount(progress.nextCycle);
    isLongBreakRef.current = progress.startsLongBreak;
    return progress.startsLongBreak;
  }, []);

  // Break completion signal
  const [breakDone, setBreakDone] = useState(0);
  const breakWasLongRef = useRef(false);

  // Break countdown → signal when done
  useEffect(() => {
    if (!isRunning || mode === 'work') return;
    deadlineRef.current = Date.now() + timeLeftRef.current * 1000;
    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
      timeLeftRef.current = remaining;
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearTimer();
        breakWasLongRef.current = isLongBreakRef.current;
        setBreakDone(n => n + 1);
      }
    }, 250);
    return clearTimer;
  }, [isRunning, mode, clearTimer]);

  // Handle break completion (runs after re-render)
  useEffect(() => {
    if (breakDone === 0) return;

    if (breakWasLongRef.current) {
      // Long break completed
      breakWasLongRef.current = false;
      playSound(playCycleComplete);
      cycleCountRef.current = 0;
      setCycleCount(0);
      setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
      setIsRunning(false);

      // Only unassigned sessions reach this point; never attach them to a task selected later.
      setPendingAssignments(prev => {
        const totalMinutes = prev.reduce((sum, p) => sum + p.duration, 0);
        if (totalMinutes > 0) {
          setGroupPhase('settle');
          return prev;
        } else {
          setTimeout(() => showToast('一轮完成！无记录'), 0);
          return [];
        }
      });
    } else {
      // Short break → play sound and auto-start next work
      playSound(playStart);
      setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
      startTimeRef.current = '';
      setIsRunning(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakDone]);

  // Complete one work pomodoro
  const completeOne = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = completedMinutes(elapsedSeconds);
    const startTime = startTimeRef.current || new Date().toISOString();
    const endTime = new Date().toISOString();
    const recordId = `focus-${deviceIdRef.current}-${startTime}`;
    startTimeRef.current = '';
    lastCheckpointMinuteRef.current = 0;

    if (!shouldRecordFocus(elapsedSeconds)) {
      setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
      showToast(`专注满 ${MIN_FOCUS_RECORD_MINUTES} 分钟后才会保存时长`);
      return;
    }

    const assignment = { id: recordId, start: startTime, end: endTime, date: formatDate(new Date(startTime)), duration: Math.max(1, elapsed) };
    const task = currentTaskRef.current;
    const requiresAssignment = !task?.id;
    if (task?.id) {
      recordPomodoro({
        ...assignment, id: recordId,
        taskId: task.id, taskTitle: task.title, category: task.category,
        countsAsPomodoro: countsAsPomodoro(assignment.duration), completed: true, createdAt: endTime,
      });
    } else {
      recordPomodoro({
        ...assignment,
        taskId: null, taskTitle: '未分配', category: '其他',
        countsAsPomodoro: countsAsPomodoro(assignment.duration), completed: true, createdAt: endTime,
      });
      setPendingAssignments(prev => [...prev, assignment]);
    }

    if (countsAsPomodoro(elapsed)) {
      setTotalPomodoros(p => p + 1);
    } else {
      showToast(`已记录 ${elapsed} 分钟；满 ${MIN_POMODORO_MINUTES} 分钟才计 1 个番茄`);
    }
    startBreak(advanceCycle());
    if (requiresAssignment) {
      resumeAfterSettleRef.current = true;
      setIsRunning(false);
      setGroupPhase('settle');
    }
  }, [clearTimer, startBreak, advanceCycle, recordPomodoro, showToast]);

  // Work countdown — tracks running minutes
  const workSecondsRef = useRef(0);
  useEffect(() => {
    if (!isRunning || mode !== 'work') {
      workSecondsRef.current = 0;
      return;
    }
    if (!startTimeRef.current) startTimeRef.current = new Date().toISOString();
    workSecondsRef.current = totalTimeRef.current - timeLeftRef.current;
    setRunningMinutes(Math.floor(workSecondsRef.current / 60));
    deadlineRef.current = Date.now() + timeLeftRef.current * 1000;
    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
      timeLeftRef.current = remaining;
      workSecondsRef.current = totalTimeRef.current - remaining;
      const completedMinute = Math.floor(workSecondsRef.current / 60);
      setRunningMinutes(completedMinute);
      if (completedMinute >= 1 && completedMinute > lastCheckpointMinuteRef.current) {
        lastCheckpointMinuteRef.current = completedMinute;
        const checkpointStart = startTimeRef.current || new Date().toISOString();
        startTimeRef.current = checkpointStart;
        const task = currentTaskRef.current;
        recordPomodoro({
          id: `focus-${deviceIdRef.current}-${checkpointStart}`,
          start: checkpointStart,
          end: new Date().toISOString(),
          date: formatDate(new Date(checkpointStart)),
          duration: completedMinute,
          taskId: task?.id ?? null,
          taskTitle: task?.title || '未分配',
          category: task?.category || '其他',
          countsAsPomodoro: false,
          completed: false,
          createdAt: checkpointStart,
        });
      }
      setTimeLeft(remaining);
      if (remaining === 0) completeOne();
    }, 250);
    return clearTimer;
  }, [isRunning, mode, clearTimer, completeOne, recordPomodoro]);

  useEffect(() => {
    if (mode !== 'work') {
      const id = setTimeout(() => setRunningMinutes(0), 0);
      return () => clearTimeout(id);
    }
  }, [mode]);

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
        id: pa.id, start: pa.start, end: pa.end, date: pa.date, duration: pa.duration,
        taskId: a.taskId, taskTitle: a.taskTitle || '未分配', category: a.category || '其他',
        countsAsPomodoro: countsAsPomodoro(pa.duration), completed: true, createdAt: pa.end,
      });
    });
    setPendingAssignments([]);
    setGroupPhase('working');
    if (resumeAfterSettleRef.current) {
      resumeAfterSettleRef.current = false;
      setIsRunning(true);
    }
    const tomatoes = pending.filter(item => countsAsPomodoro(item.duration)).length;
    showToast(`已分配 ${pending.length} 条记录${tomatoes > 0 ? `，其中 ${tomatoes} 个番茄` : ''}`);
  }, [recordPomodoro, showToast]);

  const skipAssignments = useCallback(() => {
    setPendingAssignments([]);
    setGroupPhase('working');
    showToast('已保留为未指派专注');
    if (resumeAfterSettleRef.current) {
      resumeAfterSettleRef.current = false;
      setIsRunning(true);
    }
  }, [showToast]);

  // Start next group
  const startNextGroup = useCallback(() => {
    setGroupPhase('working');
    setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
    setIsRunning(true); startTimeRef.current = '';
    playSound(playStart);
  }, [playSound]);

  // Stop
  const stop = useCallback(() => {
    setGroupPhase('working');
    clearTimer(); setIsRunning(false);
    setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
    cycleCountRef.current = 0; setCycleCount(0); startTimeRef.current = '';
    isLongBreakRef.current = false;
    resumeAfterSettleRef.current = false;
    setPendingAssignments([]);
    setRunningMinutes(0);
    lastCheckpointMinuteRef.current = 0;
  }, [clearTimer]);

  // End now: settle completed pomodoros, update cycle
  const endNow = useCallback(() => {
    clearTimer();
    playSound(playEnd);
    resumeAfterSettleRef.current = false;
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = completedMinutes(elapsedSeconds);
    const startTime = startTimeRef.current || new Date().toISOString();
    const endTime = new Date().toISOString();
    const recordId = `focus-${deviceIdRef.current}-${startTime}`;
    startTimeRef.current = '';
    lastCheckpointMinuteRef.current = 0;

    setIsRunning(false);
    setRunningMinutes(0);
    setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
    isLongBreakRef.current = false;

    // Use functional update to get latest pendingAssignments
    setPendingAssignments(prev => {
      if (shouldRecordFocus(elapsedSeconds)) {
        const isPomodoro = countsAsPomodoro(elapsed);
        if (isPomodoro) {
          setTotalPomodoros(count => count + 1);
          const nextCycle = cycleCountRef.current + 1;
          setCycleCount(nextCycle >= cycleIntervalRef.current ? 0 : nextCycle);
        }
        const task = currentTaskRef.current;
        if (task?.id) {
          recordPomodoro({
            id: recordId, start: startTime, end: endTime, date: formatDate(new Date(startTime)), duration: elapsed,
            taskId: task.id, taskTitle: task.title, category: task.category,
            countsAsPomodoro: isPomodoro, completed: true, createdAt: endTime,
          });
          setTimeout(() => showToast(isPomodoro
            ? `${elapsed} 分钟 · 1 个番茄 →「${task.title}」`
            : `已记录 ${elapsed} 分钟 →「${task.title}」；未满 ${MIN_POMODORO_MINUTES} 分钟不计番茄`), 0);
          if (prev.length > 0) setGroupPhase('settle');
          return prev;
        } else {
          recordPomodoro({
            id: recordId, start: startTime, end: endTime, date: formatDate(new Date(startTime)), duration: elapsed,
            taskId: null, taskTitle: '未分配', category: '其他',
            countsAsPomodoro: isPomodoro, completed: true, createdAt: endTime,
          });
          setGroupPhase('settle');
          return [...prev, { id: recordId, start: startTime, end: endTime, date: formatDate(new Date(startTime)), duration: elapsed }];
        }
      } else {
        setCycleCount(0);
        showToast(`未满 ${MIN_FOCUS_RECORD_MINUTES} 分钟，本次不记录`);
        if (prev.length > 0) setGroupPhase('settle');
        return prev;
      }
    });
  }, [clearTimer, recordPomodoro, showToast, playSound]);

  const resetCycle = useCallback(() => {
    cycleCountRef.current = 0; setCycleCount(0); setGroupPhase('working'); setPendingAssignments([]);
    isLongBreakRef.current = false;
  }, []);

  const importPomodoros = useCallback((records: unknown) => {
    setTodayPomodoros(current => mergeImportedPomodoros(current, records));
  }, []);

  const start = useCallback(() => {
    const isResume = timeLeftRef.current < totalTimeRef.current;
    setGroupPhase('working');
    setIsRunning(true);
    playSound(isResume ? playResume : playStart);
  }, [playSound]);

  const startWork = useCallback(() => {
    clearTimer();
    setGroupPhase('working');
    setMode('work');
    setTimeLeft(workMinutesRef.current * 60);
    setTotalTimeState(workMinutesRef.current * 60);
    startTimeRef.current = '';
    setRunningMinutes(0);
    lastCheckpointMinuteRef.current = 0;
    setIsRunning(true);
    playSound(playStart);
  }, [clearTimer, playSound]);

  const pause = useCallback(() => {
    // Immediately update runningMinutes to reflect current elapsed
    if (modeRef.current === 'work') {
      const elapsed = totalTimeRef.current - timeLeftRef.current;
      setRunningMinutes(Math.floor(elapsed / 60));
    }
    setIsRunning(false); clearTimer();
    playSound(playPause);
  }, [clearTimer, playSound]);
  const reset = useCallback(() => { endNow(); }, [endNow]);

  // Skip: quickly complete current phase and move to next (keeps running)
  const skip = useCallback(() => {
    clearTimer();
    if (modeRef.current === 'work') {
      const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
      if (shouldRecordFocus(elapsedSeconds)) {
        // Preserve elapsed duration; completeOne counts a tomato only from 15 minutes onward.
        completeOne();
      } else {
        startTimeRef.current = '';
        setRunningMinutes(0);
        lastCheckpointMinuteRef.current = 0;
        showToast(`已跳过本次，未满 ${MIN_FOCUS_RECORD_MINUTES} 分钟不记录时长`);
        startBreak(advanceCycle());
      }
    } else {
      // Skip break
      if (isLongBreakRef.current) {
        // Skip long break → settle + cycle complete sound
        isLongBreakRef.current = false;
        playSound(playCycleComplete);
        cycleCountRef.current = 0;
        setCycleCount(0);

        setPendingAssignments(prev => {
          const totalMinutes = prev.reduce((sum, p) => sum + p.duration, 0);
          if (totalMinutes > 0) {
            setGroupPhase('settle');
            return prev;
          } else {
            setTimeout(() => showToast('一轮完成！无记录'), 0);
            return [];
          }
        });

        // Reset to work mode but DON'T auto-start
        setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
        startTimeRef.current = '';
        setIsRunning(false);
      } else {
        // Skip short break → auto-start next work
        playSound(playStart);
        setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
        startTimeRef.current = '';
        setIsRunning(true);
      }
    }
  }, [clearTimer, completeOne, startBreak, advanceCycle, playSound, showToast]);

  const skipRound = useCallback(() => {
    clearTimer();
    playSound(playCycleComplete);
    const wasWork = modeRef.current === 'work';
    const elapsedSeconds = wasWork ? totalTimeRef.current - timeLeftRef.current : 0;
    const elapsed = completedMinutes(elapsedSeconds);
    const startTime = startTimeRef.current || new Date().toISOString();
    const endTime = new Date().toISOString();
    const recordId = `focus-${deviceIdRef.current}-${startTime}`;

    const freshDuration = workMinutesRef.current * 60;
    startTimeRef.current = '';
    lastCheckpointMinuteRef.current = 0;
    timeLeftRef.current = freshDuration;
    totalTimeRef.current = freshDuration;
    modeRef.current = 'work';
    cycleCountRef.current = 0;
    isLongBreakRef.current = false;
    resumeAfterSettleRef.current = false;
    setIsRunning(false);
    setRunningMinutes(0);
    setMode('work');
    setTimeLeft(freshDuration);
    setTotalTimeState(freshDuration);
    setCycleCount(0);

    setPendingAssignments(prev => {
      let next = prev;
      let message = wasWork
        ? `本轮已结算；当前专注未满 ${MIN_FOCUS_RECORD_MINUTES} 分钟，不记录时长`
        : '本轮已结算，组次已恢复初始状态';

      if (wasWork && shouldRecordFocus(elapsedSeconds)) {
        const isPomodoro = countsAsPomodoro(elapsed);
        const assignment = {
          id: recordId,
          start: startTime,
          end: endTime,
          date: formatDate(new Date(startTime)),
          duration: Math.max(1, elapsed),
        };
        const task = currentTaskRef.current;

        recordPomodoro({
          ...assignment,
          taskId: task?.id ?? null,
          taskTitle: task?.title || '未分配',
          category: task?.category || '其他',
          countsAsPomodoro: isPomodoro,
          completed: true,
          createdAt: endTime,
        });
        if (isPomodoro) setTotalPomodoros(count => count + 1);
        if (!task?.id) next = [...prev, assignment];
        message = isPomodoro
          ? `本轮已结算：${elapsed} 分钟 · 1 个番茄，组次已归零`
          : `本轮已结算：记录 ${elapsed} 分钟，组次已归零`;
      }

      setGroupPhase(next.length > 0 ? 'settle' : 'working');
      setTimeout(() => showToast(message), 0);
      return next;
    });
  }, [clearTimer, recordPomodoro, showToast, playSound]);

  return {
    mode, timeLeft, totalTime, isRunning, cycleCount, totalPomodoros, todayPomodoros,
    pendingAssignments, groupPhase, toast, runningMinutes,
    start, startWork, pause, reset, skip, skipRound, setTotalTime, setTaskInfo,
    assignAll, skipAssignments, startNextGroup, stop, endNow, resetCycle, importPomodoros, addManualPomodoro, setOnComplete,
  };
}
