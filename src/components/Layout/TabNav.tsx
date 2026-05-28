import { Timer, BarChart3, Settings } from 'lucide-react';

type TabId = 'timer' | 'stats' | 'settings';

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof Timer }[] = [
  { id: 'timer', label: '专注', icon: Timer },
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'settings', label: '设置', icon: Settings },
];

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="tab-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <tab.icon size={18} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
