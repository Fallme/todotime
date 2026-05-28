import { Timer, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  syncing: boolean;
  syncError: string | null;
}

export function Header({ darkMode, onToggleTheme, syncing, syncError }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <Timer className="header-icon" size={28} />
        <h1 className="header-title">番茄钟</h1>
      </div>
      <div className="header-right">
        {syncing && <span className="sync-badge syncing">同步中...</span>}
        {syncError && <span className="sync-badge error" title={syncError}>同步失败</span>}
        <button className="icon-btn" onClick={onToggleTheme} title="切换主题">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
