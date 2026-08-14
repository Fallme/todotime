import type { Language } from '../i18n/LanguageContext';

export const MOTIVATION_QUOTES: Record<Language, readonly string[]> = {
  'zh-CN': [
    '每一个番茄都是进步', '先专注这一轮，答案会慢慢出现', '完成比完美更接近目标',
    '把大目标，切成今天的小行动', '安静做事，时间会给你回报', '一次只做好一件事',
    '稳定前进，也是一种了不起', '开始五分钟，就已经赢过犹豫', '今天的积累，会成为明天的底气',
    '专注不是用力过猛，而是减少分心', '给重要的事留一段完整时间', '休息是为了下一轮更清醒',
  ],
  en: [
    'Every focused minute moves you forward', 'One round at a time—the answer will come', 'Done moves you closer than perfect',
    'Turn the big goal into one small action', 'Quiet work compounds over time', 'Do one thing well at a time',
    'Steady progress is still remarkable', 'Five focused minutes beat hesitation', 'Today’s effort becomes tomorrow’s confidence',
    'Focus means removing distractions, not forcing harder', 'Protect a complete block for what matters', 'Rest now so the next round stays clear',
  ],
};

export function nextQuoteIndex(current: number, length: number, random: () => number = Math.random): number {
  if (length <= 1) return 0;
  const candidate = Math.floor(random() * (length - 1));
  return candidate >= current ? candidate + 1 : candidate;
}
