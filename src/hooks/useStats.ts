import { useMemo } from 'react';
import type { DayData, PomodoroRecord, Todo } from '../types';
import { isPomodoroRecord } from '../utils/pomodoroRules';
import { getTodoCompletionRecords } from '../utils/taskRecurrence';

export interface UseStatsReturn {
  todayPomodoros: number;
  todayFocusMinutes: number;
  todayTasksCompleted: number;
  weeklyData: { date: string; minutes: number }[];
  monthlyData: { date: string; minutes: number }[];
  streak: number;
  totalPomodoros: number;
  totalFocusHours: number;
}

export function useStats(
  dayDataMap: Map<string, DayData>,
  todayPomodoros: PomodoroRecord[],
  todayDate: string,
  runningMinutes: number = 0,
  todos: Todo[] = [],
): UseStatsReturn {
  return useMemo(() => {
    const todayData = dayDataMap.get(todayDate);
    const todayPomCount = (todayData?.pomodoros ?? []).filter(isPomodoroRecord).length
      + todayPomodoros.filter(isPomodoroRecord).length;
    const todayCompletedMinutes = todayData
      ? todayData.totalFocusMinutes + todayPomodoros.reduce((s, p) => s + p.duration, 0)
      : todayPomodoros.reduce((s, p) => s + p.duration, 0);
    const todayMinutes = todayCompletedMinutes + runningMinutes;
    const todayTasks = todos.filter(todo => !todo.deletedAt)
      .reduce((sum, todo) => sum + getTodoCompletionRecords(todo).filter(record => record.completedAt.startsWith(todayDate)).length, 0);

    // Weekly data
    const weekly: { date: string; minutes: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const data = dayDataMap.get(dateStr);
      let mins = data ? data.totalFocusMinutes : 0;
      if (dateStr === todayDate) {
        mins += todayCompletedMinutes + runningMinutes;
      }
      weekly.push({ date: dateStr, minutes: mins });
    }

    // Monthly data
    const monthly: { date: string; minutes: number }[] = [];
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dayDataMap.get(dateStr);
      let mins = data ? data.totalFocusMinutes : 0;
      if (dateStr === todayDate) {
        mins += todayCompletedMinutes + runningMinutes;
      }
      monthly.push({ date: dateStr, minutes: mins });
    }

    // Streak
    let streak = 0;
    const checkDate = new Date(now);
    // if today has data, start from today
    const todayHasData = todayMinutes > 0 || (todayData && todayData.totalPomodoros > 0);
    if (!todayHasData) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      const data = dayDataMap.get(ds);
      if (data && data.totalPomodoros > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    if (todayHasData) streak++;

    // Totals
    let totalPom = 0;
    let totalMins = 0;
    dayDataMap.forEach(d => {
      totalPom += d.totalPomodoros;
      totalMins += d.totalFocusMinutes;
    });
    totalPom += todayPomodoros.filter(isPomodoroRecord).length;
    totalMins += todayPomodoros.reduce((s, p) => s + p.duration, 0) + runningMinutes;

    return {
      todayPomodoros: todayPomCount,
      todayFocusMinutes: todayMinutes,
      todayTasksCompleted: todayTasks,
      weeklyData: weekly,
      monthlyData: monthly,
      streak,
      totalPomodoros: totalPom,
      totalFocusHours: Math.round(totalMins / 60 * 10) / 10,
    };
  }, [dayDataMap, todayPomodoros, todayDate, runningMinutes, todos]);
}
