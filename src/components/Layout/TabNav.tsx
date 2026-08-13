import { Timer, BarChart3, Settings } from 'lucide-react';
import { useLanguage, type MessageKey } from '../../i18n/LanguageContext';

type TabId = 'timer' | 'stats' | 'settings';

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: MessageKey; icon: typeof Timer }[] = [
  { id: 'timer', label: 'focus', icon: Timer },
  { id: 'stats', label: 'stats', icon: BarChart3 },
  { id: 'settings', label: 'settings', icon: Settings },
];

export function TabNav({ active, onChange }: TabNavProps) {
  const { t } = useLanguage();
  return (
    <nav className="tab-nav" aria-label={t('nav')}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
          aria-label={t(tab.label)}
        >
          <tab.icon size={18} />
          <span>{t(tab.label)}</span>
        </button>
      ))}
    </nav>
  );
}
