import { useCallback, useEffect, useState } from 'react';
import { Timer, Sun, Moon, Languages, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { MOTIVATION_QUOTES, nextQuoteIndex } from '../../utils/motivation';

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  syncing: boolean;
  syncError: string | null;
}

export function Header({ darkMode, onToggleTheme, syncing, syncError }: HeaderProps) {
  const { language, toggleLanguage, t } = useLanguage();
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * MOTIVATION_QUOTES['zh-CN'].length));
  const refreshQuote = useCallback(() => {
    setQuoteIndex(current => nextQuoteIndex(current, MOTIVATION_QUOTES[language].length));
  }, [language]);

  useEffect(() => {
    const interval = window.setInterval(refreshQuote, 45_000);
    return () => window.clearInterval(interval);
  }, [language, refreshQuote]);

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
      <div className="header-quote">
        <span>{MOTIVATION_QUOTES[language][quoteIndex]}</span>
        <button type="button" onClick={refreshQuote} title={language === 'zh-CN' ? '换一句' : 'Another thought'} aria-label={language === 'zh-CN' ? '刷新激励语' : 'Refresh motivation'}>
          <RefreshCw size={12} />
        </button>
      </div>
    </header>
  );
}
