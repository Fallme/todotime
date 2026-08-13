import { useState } from 'react';
import { CheckCircle2, Copy, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { createSyncCode, isValidSyncCode, normalizeSyncCode } from '../../utils/syncIdentity';
import { useLanguage } from '../../i18n/LanguageContext';

export type SyncCodeMode = 'existing' | 'new';

interface SyncCodeGateProps {
  onActivate: (code: string, mode: SyncCodeMode) => Promise<void>;
}

export function SyncCodeGate({ onActivate }: SyncCodeGateProps) {
  const { language, toggleLanguage, t } = useLanguage();
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<SyncCodeMode>('existing');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const generateCode = () => {
    setCode(createSyncCode());
    setMode('new');
    setVisible(true);
    setCopied(false);
    setMessage(language === 'zh-CN' ? '这是你的新专属码。请先复制保存，再进入 TodoTime。' : 'This is your new personal code. Copy and save it before entering TodoTime.');
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setMessage(language === 'zh-CN' ? '专属码已复制。请存放在安全的位置。' : 'Code copied. Keep it somewhere safe.');
    } catch {
      setVisible(true);
      setMessage(language === 'zh-CN' ? '自动复制失败，请长按或选中专属码手动复制。' : 'Could not copy automatically. Select the code and copy it manually.');
    }
  };

  const activate = async () => {
    const normalized = normalizeSyncCode(code);
    if (!isValidSyncCode(normalized)) {
      setMessage(language === 'zh-CN' ? '请输入有效专属码：至少 12 位，仅包含字母、数字、短横线或下划线。' : 'Enter a valid code of at least 12 letters, numbers, hyphens, or underscores.');
      return;
    }
    if (mode === 'new' && !copied) {
      setMessage(language === 'zh-CN' ? '请先复制并保存新专属码，避免以后无法找回数据。' : 'Copy and save your new code first. It cannot be recovered later.');
      return;
    }

    setBusy(true);
    setMessage(mode === 'existing' ? (language === 'zh-CN' ? '正在确认并加载你的数据…' : 'Checking and loading your data…') : (language === 'zh-CN' ? '正在创建独立数据空间…' : 'Creating your private data space…'));
    try {
      await onActivate(normalized, mode);
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      setMessage(detail === 'Failed to fetch'
        ? (language === 'zh-CN' ? '暂时无法连接同步服务，请检查网络后重试。' : 'Unable to reach the sync service. Check your connection and retry.')
        : detail || (language === 'zh-CN' ? '暂时无法加载，请稍后重试。' : 'Unable to load right now. Please retry.'));
      setBusy(false);
    }
  };

  return (
    <main className="sync-gate">
      <section className="sync-gate-card" aria-labelledby="sync-gate-title">
        <div className="sync-gate-brand">
          <span className="sync-gate-logo"><KeyRound size={24} aria-hidden="true" /></span>
          <span>TodoTime</span>
          <button type="button" className="gate-language-toggle" onClick={toggleLanguage}>{language === 'zh-CN' ? 'English' : '中文'}</button>
        </div>
        <div className="sync-gate-heading">
          <p className="sync-gate-kicker">{t('gateKicker')}</p>
          <h1 id="sync-gate-title">{t('gateTitle')}</h1>
          <p>{t('gateDesc')}</p>
        </div>

        <div className="sync-gate-tabs" role="tablist" aria-label={t('syncCode')}>
          <button type="button" role="tab" aria-selected={mode === 'existing'} className={mode === 'existing' ? 'active' : ''}
            onClick={() => { setMode('existing'); setCode(''); setCopied(false); setMessage(''); }}>
            {t('haveCode')}
          </button>
          <button type="button" role="tab" aria-selected={mode === 'new'} className={mode === 'new' ? 'active' : ''}
            onClick={generateCode}>
            {t('createNewCode')}
          </button>
        </div>

        <label className="sync-code-label" htmlFor="sync-code-input">
          {mode === 'existing' ? t('syncCode') : t('newCode')}
        </label>
        <div className="sync-code-field">
          <input id="sync-code-input" type={visible ? 'text' : 'password'} value={code}
            autoCapitalize="characters" autoComplete="off" spellCheck={false}
            placeholder={t('codeExample')}
            onChange={event => { setCode(normalizeSyncCode(event.target.value)); setMode('existing'); setCopied(false); setMessage(''); }}
            onKeyDown={event => { if (event.key === 'Enter') void activate(); }}
            aria-describedby="sync-code-message" />
          <button type="button" className="sync-code-icon-btn" onClick={() => setVisible(value => !value)} aria-label={visible ? t('hide') : t('show')}>
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
          {mode === 'new' && (
            <button type="button" className="sync-code-icon-btn" onClick={() => void copyCode()} aria-label={t('copy')}>
              {copied ? <CheckCircle2 size={19} /> : <Copy size={19} />}
            </button>
          )}
        </div>

        <button type="button" className="sync-gate-primary" disabled={busy || !code} onClick={() => void activate()}>
          {busy ? t('processing') : mode === 'existing' ? t('enterTodoTime') : t('saveCodeStart')}
        </button>
        <button type="button" className="sync-gate-create" onClick={generateCode}>
          {mode === 'new' ? t('regenerate') : t('noCodeCreate')}
        </button>

        <p id="sync-code-message" className={`sync-gate-message ${message ? 'show' : ''}`} aria-live="polite">{message}</p>
        <div className="sync-gate-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p><strong>{t('protectCode')}</strong><span>{t('protectCodeDesc')}</span></p>
        </div>
      </section>
    </main>
  );
}
