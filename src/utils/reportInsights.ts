export interface ReportDaySummary {
  date: string;
  minutes: number;
  pomodoros: number;
  tasksDone: number;
}

export interface ReportInsightInput {
  language?: 'zh-CN' | 'en';
  period: 'week' | 'month';
  daily: ReportDaySummary[];
  totalMinutes: number;
  totalPomodoros: number;
  totalTasksCompleted: number;
  categoryMinutes: Record<string, number>;
  previousMinutes: number;
  previousPomodoros: number;
  previousTasksCompleted: number;
}

export interface ReportInsight {
  kind: 'positive' | 'neutral' | 'attention';
  title: string;
  text: string;
}

function select<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round((current - previous) / previous * 100);
}

export function generateReportInsights(input: ReportInsightInput): ReportInsight[] {
  const { period, daily, totalMinutes, totalPomodoros, totalTasksCompleted, categoryMinutes,
    previousMinutes, previousPomodoros, previousTasksCompleted } = input;
  const periodName = period === 'week' ? '本周' : '本月';
  const nextPeriod = period === 'week' ? '下周' : '下个月';
  const activeDays = daily.filter(day => day.minutes > 0 || day.tasksDone > 0).length;
  const activeRatio = daily.length ? activeDays / daily.length : 0;
  const activeAverage = activeDays ? Math.round(totalMinutes / activeDays) : 0;
  const seed = totalMinutes + totalPomodoros * 7 + totalTasksCompleted * 13 + activeDays * 17;

  if (input.language === 'en') {
    const changes = [percentChange(totalMinutes, previousMinutes), percentChange(totalPomodoros, previousPomodoros), percentChange(totalTasksCompleted, previousTasksCompleted)].filter((value): value is number => value !== null);
    const averageChange = changes.length ? Math.round(changes.reduce((sum, value) => sum + value, 0) / changes.length) : null;
    const insights: ReportInsight[] = [];
    if (totalMinutes === 0 && totalTasksCompleted === 0) return [
      { kind: 'neutral', title: 'Ready for your first entry', text: `There is no focus data for this ${period === 'week' ? 'week' : 'month'} yet. Begin with one small 15-minute target.` },
      { kind: 'attention', title: 'A simple next step', text: `Aim for one pomodoro and one completed task ${period === 'week' ? 'next week' : 'next month'}, then build gradually.` },
    ];
    if (averageChange === null) insights.push({ kind: 'positive', title: 'A new baseline', text: `You logged ${totalMinutes} focused minutes, ${totalPomodoros} pomodoros, and ${totalTasksCompleted} completed tasks. Keep tracking to reveal a useful trend.` });
    else if (averageChange >= 20) insights.push({ kind: 'positive', title: 'Strong overall growth', text: `Your core metrics improved by about ${averageChange}% on average. The current rhythm is turning effort into outcomes.` });
    else if (averageChange >= 5) insights.push({ kind: 'positive', title: 'Steady progress', text: `Core metrics rose by about ${averageChange}%—a healthy, sustainable pace.` });
    else if (averageChange > -5) insights.push({ kind: 'neutral', title: 'A stable rhythm', text: 'Results are close to the previous period. Choose one metric for a small, focused improvement next.' });
    else if (averageChange > -20) insights.push({ kind: 'neutral', title: 'A small dip', text: `Core metrics fell about ${Math.abs(averageChange)}%. Check for temporary disruptions and avoid compensating with an unsustainable sprint.` });
    else insights.push({ kind: 'attention', title: 'Rebuild the rhythm', text: `Core metrics fell about ${Math.abs(averageChange)}%. Restore a consistent start time before trying to recover total volume.` });
    if (activeRatio >= .8) insights.push({ kind: 'positive', title: 'Excellent consistency', text: `${activeDays} active days gave you ${Math.round(activeRatio * 100)}% coverage. Showing up consistently is a real strength.` });
    else if (activeRatio >= .5) insights.push({ kind: 'neutral', title: 'A rhythm is forming', text: `${activeDays} active days averaged ${activeAverage} focused minutes. Turn a few gaps into light-focus days.` });
    else insights.push({ kind: 'attention', title: 'Focus is concentrated', text: `Only ${activeDays} days have meaningful activity. Smaller tasks on more days may work better than occasional high-volume sessions.` });
    if (totalPomodoros >= 4 && totalTasksCompleted === 0) insights.push({ kind: 'attention', title: 'Effort needs a finish line', text: `${totalPomodoros} pomodoros were logged without a completed task. Break large work into pieces that can close within a day.` });
    else if (totalTasksCompleted > totalPomodoros && totalMinutes < totalTasksCompleted * 10) insights.push({ kind: 'neutral', title: 'Many fragmented tasks', text: `You completed ${totalTasksCompleted} tasks with short focus per item. Batch similar small tasks to reduce switching costs.` });
    else if (totalTasksCompleted > 0 && totalPomodoros > 0) insights.push({ kind: 'positive', title: 'Effort reached outcomes', text: `${totalMinutes} focused minutes produced ${totalTasksCompleted} completed tasks—about ${Math.round(totalMinutes / totalTasksCompleted)} minutes each.` });
    const categories = Object.entries(categoryMinutes).filter(([, minutes]) => minutes > 0).sort((a, b) => b[1] - a[1]);
    if (categories.length) {
      const [topCategory, topMinutes] = categories[0]; const topShare = totalMinutes ? topMinutes / totalMinutes : 0;
      if (topShare >= .7) insights.push({ kind: 'neutral', title: 'Highly concentrated energy', text: `${topCategory} received ${Math.round(topShare * 100)}% of your focus. Great if it is the priority; otherwise, check what is being crowded out.` });
      else if (categories.length >= 3 && topShare < .5) insights.push({ kind: 'positive', title: 'Balanced categories', text: `Focus was spread across ${categories.length} categories, with the largest at only ${Math.round(topShare * 100)}%.` });
    }
    const bestDay = daily.reduce<ReportDaySummary | null>((best, day) => !best || day.minutes > best.minutes ? day : best, null);
    if (bestDay?.minutes) insights.push({ kind: 'positive', title: 'A clue from your best day', text: `${bestDay.date.slice(5)} led with ${bestDay.minutes} focused minutes. Review that day’s timing, environment, and task setup.` });
    return insights.slice(0, 4);
  }

  if (totalMinutes === 0 && totalTasksCompleted === 0) {
    return [
      { kind: 'neutral', title: '等待第一条记录', text: select([
        `${periodName}还没有专注记录。从一个 15 分钟的小目标开始，更容易建立启动惯性。`,
        `${periodName}暂时是空白页。先选一件最重要的小事，完成第一个可记录的专注段。`,
        `没有数据不代表没有进展。${periodName}可以先尝试固定一个容易坚持的专注时段。`,
      ], seed) },
      { kind: 'attention', title: '下一步建议', text: `${nextPeriod}先以“完成 1 个番茄、结束 1 个任务”为最低目标，完成后再逐步增加。` },
    ];
  }

  const insights: ReportInsight[] = [];
  const changes = [
    percentChange(totalMinutes, previousMinutes),
    percentChange(totalPomodoros, previousPomodoros),
    percentChange(totalTasksCompleted, previousTasksCompleted),
  ].filter((value): value is number => value !== null);
  const averageChange = changes.length ? Math.round(changes.reduce((sum, value) => sum + value, 0) / changes.length) : null;

  if (averageChange === null) {
    insights.push({ kind: 'positive', title: '新的积累', text: select([
      `${periodName}建立了新的专注基线：${totalMinutes} 分钟、${totalPomodoros} 个番茄。继续记录后，趋势判断会更准确。`,
      `${periodName}开始形成可追踪的节奏，共完成 ${totalPomodoros} 个番茄和 ${totalTasksCompleted} 项任务。`,
    ], seed) });
  } else if (averageChange >= 20) {
    insights.push({ kind: 'positive', title: '整体明显上升', text: select([
      `核心指标较上期平均提升约 ${averageChange}%，投入和产出同步增长，当前节奏有效。`,
      `${periodName}综合表现提升约 ${averageChange}%，专注正在稳定转化为实际完成。`,
      `与上期相比进步明显，综合增幅约 ${averageChange}%。建议保持当前安排，避免突然加量。`,
    ], seed) });
  } else if (averageChange >= 5) {
    insights.push({ kind: 'positive', title: '稳步进步', text: `核心指标较上期平均提高约 ${averageChange}%，这是较健康、可持续的上升速度。` });
  } else if (averageChange > -5) {
    insights.push({ kind: 'neutral', title: '节奏保持稳定', text: select([
      `整体与上期接近，波动控制得不错。${nextPeriod}可以只挑一个指标小幅突破。`,
      `投入和产出基本持平，说明已有节奏较稳定。下一阶段适合优化质量，而非单纯堆时长。`,
    ], seed) });
  } else if (averageChange > -20) {
    insights.push({ kind: 'neutral', title: '状态轻微回落', text: `核心指标较上期平均下降约 ${Math.abs(averageChange)}%。先检查是否有临时事务影响，不必用突击加量补偿。` });
  } else {
    insights.push({ kind: 'attention', title: '需要重新找回节奏', text: select([
      `核心指标较上期平均下降约 ${Math.abs(averageChange)}%。${nextPeriod}先恢复固定开始时间，比追赶总量更重要。`,
      `本期下降较明显。建议缩小单次目标、减少启动阻力，先把连续性重新建立起来。`,
    ], seed) });
  }

  if (activeRatio >= 0.8) {
    insights.push({ kind: 'positive', title: '连续性很好', text: select([
      `${activeDays} 天有有效记录，覆盖率达到 ${Math.round(activeRatio * 100)}%。稳定出现比偶尔高强度更有价值。`,
      `${periodName}大部分日期都保持了行动，连续性已经成为你的优势。`,
    ], seed + 1) });
  } else if (activeRatio >= 0.5) {
    insights.push({ kind: 'neutral', title: '节奏基本成形', text: `${activeDays} 天有有效记录，活跃日平均专注 ${activeAverage} 分钟。可以尝试把空档日补成轻量专注日。` });
  } else {
    insights.push({ kind: 'attention', title: '专注分布偏集中', text: `${periodName}只有 ${activeDays} 天留下有效记录。与其在少数几天冲量，不如把任务拆小，增加出现频率。` });
  }

  if (totalPomodoros >= 4 && totalTasksCompleted === 0) {
    insights.push({ kind: 'attention', title: '投入尚未形成闭环', text: `已经投入 ${totalPomodoros} 个番茄，但没有完成任务记录。建议把大任务拆成当天可结束的子任务。` });
  } else if (totalTasksCompleted > totalPomodoros && totalMinutes < totalTasksCompleted * 10) {
    insights.push({ kind: 'neutral', title: '碎片任务较多', text: `完成了 ${totalTasksCompleted} 项任务，但单项专注投入较短。可把同类小任务合并处理，减少切换成本。` });
  } else if (totalTasksCompleted > 0 && totalPomodoros > 0) {
    insights.push({ kind: 'positive', title: '投入产出有闭环', text: `${totalMinutes} 分钟专注转化为 ${totalTasksCompleted} 项完成，平均每项约 ${Math.round(totalMinutes / totalTasksCompleted)} 分钟。` });
  }

  const categories = Object.entries(categoryMinutes).filter(([, minutes]) => minutes > 0).sort((a, b) => b[1] - a[1]);
  if (categories.length) {
    const [topCategory, topMinutes] = categories[0];
    const topShare = totalMinutes ? topMinutes / totalMinutes : 0;
    if (topShare >= 0.7) {
      insights.push({ kind: 'neutral', title: '精力高度集中', text: `${topCategory}占据 ${Math.round(topShare * 100)}% 的专注时长。若这是当前主目标，方向很清晰；否则需要留意其他板块被挤压。` });
    } else if (categories.length >= 3 && topShare < 0.5) {
      insights.push({ kind: 'positive', title: '板块分配均衡', text: `精力分布在 ${categories.length} 个板块，最高占比仅 ${Math.round(topShare * 100)}%，整体安排较均衡。` });
    }
  }

  const bestDay = daily.reduce<ReportDaySummary | null>((best, day) => !best || day.minutes > best.minutes ? day : best, null);
  if (bestDay && bestDay.minutes > 0) {
    insights.push({ kind: 'positive', title: '高效日线索', text: `${bestDay.date.slice(5)} 是本期投入最高的一天，共专注 ${bestDay.minutes} 分钟。可以复盘当天的时间、环境和任务安排。` });
  }
  return insights.slice(0, 4);
}
