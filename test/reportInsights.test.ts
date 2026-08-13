import assert from 'node:assert/strict';
import test from 'node:test';
import { generateReportInsights } from '../src/utils/reportInsights.ts';

const days = (minutes: number[]) => minutes.map((value, index) => ({
  date: `2026-08-${String(index + 1).padStart(2, '0')}`,
  minutes: value,
  pomodoros: Math.floor(value / 20),
  tasksDone: value > 0 ? 1 : 0,
}));

test('empty reports receive a concrete starting suggestion', () => {
  const insights = generateReportInsights({ period: 'week', daily: days([0, 0, 0, 0, 0, 0, 0]), totalMinutes: 0, totalPomodoros: 0, totalTasksCompleted: 0, categoryMinutes: {}, previousMinutes: 0, previousPomodoros: 0, previousTasksCompleted: 0 });
  assert.equal(insights[0]?.title, '等待第一条记录');
  assert.match(insights[1]?.text ?? '', /下周/);
});

test('growth and consistency produce positive analysis', () => {
  const insights = generateReportInsights({ period: 'week', daily: days([40, 45, 50, 35, 60, 40, 45]), totalMinutes: 315, totalPomodoros: 14, totalTasksCompleted: 7, categoryMinutes: { 数学: 170, 英语: 145 }, previousMinutes: 180, previousPomodoros: 8, previousTasksCompleted: 4 });
  assert.ok(insights.some(item => item.title === '整体明显上升'));
  assert.ok(insights.some(item => item.title === '连续性很好'));
});

test('imbalanced categories and weak completion receive targeted advice', () => {
  const insights = generateReportInsights({ period: 'month', daily: days([100, 0, 0, 0, 0, 0, 0]), totalMinutes: 100, totalPomodoros: 5, totalTasksCompleted: 0, categoryMinutes: { 专业课: 90, 其他: 10 }, previousMinutes: 200, previousPomodoros: 10, previousTasksCompleted: 3 });
  assert.ok(insights.some(item => item.title === '专注分布偏集中'));
  assert.ok(insights.some(item => item.title === '投入尚未形成闭环'));
  assert.ok(insights.some(item => item.title === '精力高度集中'));
});
