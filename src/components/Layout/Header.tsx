import { Timer, Sun, Moon, Languages } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  syncing: boolean;
  syncError: string | null;
}

export function Header({ darkMode, onToggleTheme, syncing, syncError }: HeaderProps) {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="header-wrapper">
      <header className="header">
        <div className="header-left">
          <Timer className="header-icon" size={28} />
          <h1 className="header-title">{t('appName')}</h1>
        </div>
        <div className="header-right">
          {syncing && <span className="sync-badge syncing">{t('syncing')}</span>}
          {syncError && <span className="sync-badge error" title={syncError}>{t('syncFailed')}</span>}
          <button className="language-toggle" onClick={toggleLanguage} title={t('switchLanguage')} aria-label={t('switchLanguage')}>
            <Languages size={16} /><span>{language === 'zh-CN' ? 'EN' : '中'}</span>
          </button>
          <button className="icon-btn" onClick={onToggleTheme} title={t('toggleTheme')}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>
      <div className="header-quote">{t('quote')}</div>
    </header>
  );
}
