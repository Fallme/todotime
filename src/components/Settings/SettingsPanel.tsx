import { useState } from 'react';
import type { AppSettings } from '../../types';
import { Download, Upload, Trash2, Copy, RefreshCw } from 'lucide-react';
import { createSyncCode, isValidSyncCode, normalizeSyncCode } from '../../utils/syncIdentity';
import type { SyncCodeMode } from '../Auth/SyncCodeGate';
import { useLanguage } from '../../i18n/LanguageContext';

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  onActivateSyncCode: (code: string, mode: SyncCodeMode) => Promise<void>;
  syncing: boolean;
  lastSyncedAt: string;
}

export function SettingsPanel({ settings, onSave, onExport, onImport, onClear, onActivateSyncCode, syncing, lastSyncedAt }: SettingsPanelProps) {
  const { language, setLanguage, t } = useLanguage();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [syncCodeDraft, setSyncCodeDraft] = useState(settings.syncCode);
  const [codeMessage, setCodeMessage] = useState('');
  const [isNewCode, setIsNewCode] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => onSave({ ...settings, [key]: value });
  const msg = (zh: string, en: string) => language === 'zh-CN' ? zh : en;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
  };

  const activateCode = async (mode: SyncCodeMode) => {
    const code = normalizeSyncCode(syncCodeDraft);
    if (!isValidSyncCode(code)) {
      setCodeMessage(msg('识别码至少 12 位，只能包含字母、数字、下划线和短横线', 'Codes must be at least 12 characters using letters, numbers, underscores, or hyphens.'));
      return;
    }
    setCodeMessage(mode === 'new' ? msg('正在创建独立数据空间…', 'Creating a separate data space…') : msg('正在加载该用户的数据…', 'Loading this profile…'));
    try { await onActivateSyncCode(code, mode); }
    catch (error) {
      const detail = error instanceof Error ? error.message : '';
      setCodeMessage(detail === 'Failed to fetch' ? msg('暂时无法连接同步服务，请检查网络后重试', 'Unable to reach sync. Check your connection and retry.') : detail || msg('加载失败，请稍后重试', 'Unable to load. Please retry.'));
    }
  };

  const createCode = () => {
    setSyncCodeDraft(createSyncCode());
    setIsNewCode(true);
    setCodeVisible(true);
    setCodeMessage(msg('新识别码已生成，请复制保存后点击“启用新识别码”', 'New code generated. Copy it before selecting “Use new code”.'));
  };

  return (
    <div className="settings-panel">
      <h2 className="settings-title">{t('settings')}</h2>

      <section className="settings-section">
        <h3>{t('timer')}</h3>
        {([
          ['workMinutes', 'workDuration', 1, 90],
          ['shortBreakMinutes', 'shortBreakDuration', 1, 30],
          ['longBreakMinutes', 'longBreakDuration', 1, 60],
          ['longBreakInterval', 'longBreakInterval', 2, 10],
        ] as const).map(([key, label, min, max]) => (
          <div className="settings-row" key={key}>
            <label>{t(label)}</label>
            <input type="number" min={min} max={max} value={settings[key]} onChange={event => update(key, Number(event.target.value))} />
          </div>
        ))}
      </section>

      <section className="settings-section">
        <h3>{t('general')}</h3>
        <div className="settings-row toggle"><label>{t('sound')}</label><button className={`toggle-btn ${settings.soundEnabled ? 'on' : ''}`} onClick={() => update('soundEnabled', !settings.soundEnabled)}>{settings.soundEnabled ? t('on') : t('off')}</button></div>
        <div className="settings-row toggle"><label>{t('darkMode')}</label><button className={`toggle-btn ${settings.darkMode ? 'on' : ''}`} onClick={() => update('darkMode', !settings.darkMode)}>{settings.darkMode ? t('on') : t('off')}</button></div>
        <div className="settings-row">
          <label>{t('language')}</label>
          <div className="settings-language-switch" role="group" aria-label={t('language')}>
            <button className={language === 'zh-CN' ? 'active' : ''} type="button" onClick={() => setLanguage('zh-CN')}>{t('chinese')}</button>
            <button className={language === 'en' ? 'active' : ''} type="button" onClick={() => setLanguage('en')}>{t('english')}</button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3>{t('personalSync')}</h3>
        <div className="settings-row">
          <label>{t('syncCode')}</label>
          <input type={codeVisible ? 'text' : 'password'} autoComplete="off" spellCheck={false} placeholder={t('syncCodePlaceholder')} value={syncCodeDraft}
            onChange={event => { setSyncCodeDraft(normalizeSyncCode(event.target.value)); setIsNewCode(false); }} />
        </div>
        <div className="settings-actions" style={{ marginTop: 8 }}>
          <button className="btn secondary" type="button" onClick={createCode}>{t('createCode')}</button>
          <button className="btn secondary" type="button" onClick={() => setCodeVisible(value => !value)}>{codeVisible ? t('hide') : t('show')}</button>
          <button className="btn secondary" type="button" disabled={!syncCodeDraft} onClick={() => { void navigator.clipboard.writeText(syncCodeDraft); setCodeMessage(msg('识别码已复制，请妥善保存', 'Code copied. Keep it safe.')); }}><Copy size={15} /> {t('copy')}</button>
          <button className="btn primary" type="button" disabled={syncing || !syncCodeDraft || !isNewCode} onClick={() => void activateCode('new')}><RefreshCw size={15} className={syncing ? 'spin' : ''} />{t('enableNewCode')}</button>
          <button className="btn secondary" type="button" disabled={syncing || !syncCodeDraft || syncCodeDraft === settings.syncCode} onClick={() => void activateCode('existing')}>{t('loadExistingCode')}</button>
        </div>
        <p className="settings-hint">{t('syncHint')}</p>
        {codeMessage && <p className="settings-hint">{codeMessage}</p>}
        {lastSyncedAt && <p className="settings-hint">{t('lastSynced')}：{new Date(lastSyncedAt).toLocaleString(language)}</p>}
      </section>

      <div className="settings-actions">
        <button className="btn secondary" onClick={onExport}><Download size={16} /> {t('exportData')}</button>
        <label className="btn secondary"><Upload size={16} /> {t('importData')}<input type="file" accept=".json" onChange={handleFileChange} hidden /></label>
        {!showClearConfirm ? (
          <button className="btn danger" onClick={() => setShowClearConfirm(true)}><Trash2 size={16} /> {t('clearData')}</button>
        ) : (
          <div className="clear-confirm"><span>{t('clearConfirm')}</span><button className="btn danger small" onClick={() => { onClear(); setShowClearConfirm(false); }}>{t('confirm')}</button><button className="btn secondary small" onClick={() => setShowClearConfirm(false)}>{t('cancel')}</button></div>
        )}
      </div>
    </div>
  );
}
