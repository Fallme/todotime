import { useMemo } from 'react';
import { Timer, Sun, Moon } from 'lucide-react';

const QUOTES = [
  '每一个番茄都是进步',
  '专注是最好的时间管理',
  '今天的努力，明天的收获',
  '千里之行，始于足下',
  '坚持就是胜利',
  '不积跬步，无以至千里',
  '滴水穿石，非一日之功',
  '学如逆水行舟，不进则退',
  '你比你想象的更强大',
  '每一次专注都在靠近目标',
  '保持节奏，享受过程',
  '做你害怕做的事，害怕自然会消失',
  '种一棵树最好的时间是十年前，其次是现在',
  '把每天当成最后一天来学',
  '慢就是快，少就是多',
];

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
}

export function Header({ darkMode, onToggleTheme }: HeaderProps) {
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  return (
    <header className="header-wrapper">
      <header className="header">
        <div className="header-left">
          <Timer className="header-icon" size={28} />
          <h1 className="header-title">番茄钟</h1>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={onToggleTheme} title="切换主题">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>
      <div className="header-quote">{quote}</div>
    </header>
  );
}
