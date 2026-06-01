import { useMemo, useState } from 'react';
import type { DayData } from '../../types';

interface DailyReportProps {
  dayDataMap: Map<string, DayData>;
}

export function DailyReport({ dayDataMap }: DailyReportProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const report = useMemo(() => {
    const now = new Date();
    const days: string[] = [];
    const count = period === 'week' ? 7 : 30;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    let totalPomodoros = 0;
    let totalMinutes = 0;
    let totalTasks = 0;
    let activeDays = 0;

    const daily = days.map(date => {
      const data = dayDataMap.get(date);
      const poms = data?.pomodoros?.filter(p => p.completed) ?? [];
      const tasksDone = data?.tasks?.filter(t => t.done).length ?? 0;
      const mins = poms.reduce((s, p) => s + p.duration, 0);
      totalPomodoros += poms.length;
      totalMinutes += mins;
      totalTasks += tasksDone;
      if (poms.length > 0) activeDays++;
      return { date, pomodoros: poms.length, minutes: mins, tasksDone };
    });

    return { daily, totalPomodoros, totalMinutes, totalTasks, activeDays, days: days.length };
  }, [dayDataMap, period]);

  const generateReportText = () => {
    const lines = [];
    const title = period === 'week' ? '周报' : '月报';
    lines.push(`📅 ${title} (${report.daily[0]?.date} ~ ${report.daily[report.daily.length - 1]?.date})`);
    lines.push('');
    lines.push(`🍅 番茄总数: ${report.totalPomodoros}`);
    lines.push(`⏱ 总专注: ${report.totalMinutes} 分钟 (${(report.totalMinutes / 60).toFixed(1)} 小时)`);
    lines.push(`✅ 完成任务: ${report.totalTasks}`);
    lines.push(`📊 活跃天数: ${report.activeDays}/${report.days}`);
    lines.push(`📈 日均番茄: ${report.activeDays > 0 ? (report.totalPomodoros / report.days).toFixed(1) : 0}`);
    lines.push('');
    lines.push('--- 每日明细 ---');
    report.daily.forEach(d => {
      if (d.pomodoros > 0 || d.tasksDone > 0) {
        lines.push(`${d.date.slice(5)}: 🍅${d.pomodoros} ⏱${d.minutes}min ✅${d.tasksDone}任务`);
      }
    });
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReportText());
  };

  return (
    <div className="chart-container">
      <div className="report-header">
        <h3 className="chart-title">📊 {period === 'week' ? '周报' : '月报'}</h3>
        <div className="report-tabs">
          <button className={`report-tab ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>周</button>
          <button className={`report-tab ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>月</button>
        </div>
      </div>

      <div className="report-summary">
        <div className="report-stat">
          <span className="report-stat-val">{report.totalPomodoros}</span>
          <span className="report-stat-label">🍅 总番茄</span>
        </div>
        <div className="report-stat">
          <span className="report-stat-val">{(report.totalMinutes / 60).toFixed(1)}h</span>
          <span className="report-stat-label">⏱ 总专注</span>
        </div>
        <div className="report-stat">
          <span className="report-stat-val">{report.totalTasks}</span>
          <span className="report-stat-label">✅ 完成任务</span>
        </div>
        <div className="report-stat">
          <span className="report-stat-val">{report.activeDays}/{report.days}</span>
          <span className="report-stat-label">📊 活跃天</span>
        </div>
      </div>

      <div className="report-bar-list">
        {report.daily.map(d => (
          <div key={d.date} className="report-bar-row">
            <span className="report-bar-date">{d.date.slice(5)}</span>
            <div className="report-bar-track">
              <div className="report-bar-fill" style={{ width: `${report.totalPomodoros > 0 ? (d.pomodoros / Math.max(...report.daily.map(x => x.pomodoros), 1)) * 100 : 0}%` }} />
            </div>
            <span className="report-bar-val">{d.pomodoros > 0 ? `🍅${d.pomodoros}` : ''}</span>
          </div>
        ))}
      </div>

      <button className="btn secondary report-copy" onClick={handleCopy}>📋 复制报告</button>
    </div>
  );
}
