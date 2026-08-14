import { useState } from 'react';
import type { AppSettings, ThemeId } from '../../types';
import { Download, Upload, Trash2, Copy, RefreshCw, Check, Palette } from 'lucide-react';
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

const THEME_OPTIONS: Array<{
  id: ThemeId;
  name: [string, string];
  description: [string, string];
  colors: [string, string, string];
}> = [
  { id: 'tomato', name: ['默认番茄', 'Classic Tomato'], description: ['原有温暖清爽风格', 'The original warm, clean look'], colors: ['#ff6b6b', '#ffa07a', '#ffffff'] },
  { id: 'apple', name: ['苹果极简', 'Apple Minimal'], description: ['通透、克制的玻璃质感', 'Clean, calm frosted glass'], colors: ['#007aff', '#34c759', '#f5f5f7'] },
  { id: 'sketch', name: ['手绘纸张', 'Hand-drawn'], description: ['纸张纹理与自然线条', 'Paper texture and lively lines'], colors: ['#e05a47', '#2f766f', '#fffaf0'] },
  { id: 'pixel', name: ['像素游戏', 'Pixel Arcade'], description: ['方角、像素和游戏感', 'Blocky, playful arcade style'], colors: ['#ff4f69', '#5cd85a', '#fff4c2'] },
  { id: 'cyber', name: ['赛博霓虹', 'Cyber Neon'], description: ['深色网格与霓虹光效', 'Dark grids and neon glow'], colors: ['#00f5d4', '#ff2e88', '#101126'] },
  { id: 'matcha', name: ['抹茶自然', 'Matcha Calm'], description: ['柔和绿意与有机圆角', 'Soft greens and organic shapes'], colors: ['#6f8f52', '#b6cb87', '#f4f3e8'] },
  { id: 'ocean', name: ['海洋蓝调', 'Ocean Blue'], description: ['清澈蓝色与轻盈波浪', 'Fresh blues and airy waves'], colors: ['#087ea4', '#49b6c8', '#effaff'] },
  { id: 'ink', name: ['纸墨东方', 'Ink & Paper'], description: ['留白、纸色和朱砂点缀', 'Paper, ink and vermilion'], colors: ['#b83b2e', '#262521', '#f4efe3'] },
  { id: 'sunset', name: ['日落暖橙', 'Sunset Glow'], description: ['蜜桃、暖橙与柔和渐变', 'Peach, amber and soft gradients'], colors: ['#f06c54', '#f4a261', '#fff2e7'] },
  { id: 'midnight', name: ['星夜深蓝', 'Midnight Stars'], description: ['静谧星空与蓝紫微光', 'Quiet starlight and indigo glow'], colors: ['#8b7cf6', '#4cc9f0', '#11162e'] },
];

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

      <section className="settings-section theme-settings-section">
        <div className="theme-section-heading">
          <span className="theme-heading-icon"><Palette size={16} /></span>
          <div>
            <h3>{msg('主题风格', 'Theme styles')}</h3>
            <p>{msg('默认主题保持不变，选择会自动保存并同步到当前专属码。', 'The classic theme stays unchanged. Your choice is saved and synced to this profile.')}</p>
          </div>
        </div>
        <div className="theme-gallery" role="list" aria-label={msg('主题风格', 'Theme styles')}>
          {THEME_OPTIONS.map(option => {
            const selected = settings.theme === option.id;
            const copyIndex = language === 'zh-CN' ? 0 : 1;
            return (
              <button
                className={`theme-option theme-preview-${option.id} ${selected ? 'selected' : ''}`}
                type="button"
                role="listitem"
                aria-pressed={selected}
                key={option.id}
                onClick={() => update('theme', option.id)}
              >
                <span className="theme-preview" aria-hidden="true">
                  <span className="theme-preview-sidebar" style={{ backgroundColor: option.colors[0] }} />
                  <span className="theme-preview-content">
                    <span className="theme-preview-line" />
                    <span className="theme-preview-card">
                      <span style={{ backgroundColor: option.colors[1] }} />
                      <span style={{ backgroundColor: option.colors[0] }} />
                    </span>
                  </span>
                  {selected && <span className="theme-selected-mark"><Check size={12} /></span>}
                </span>
                <span className="theme-option-copy">
                  <strong>{option.name[copyIndex]}</strong>
                  <small>{option.description[copyIndex]}</small>
                </span>
              </button>
            );
          })}
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
