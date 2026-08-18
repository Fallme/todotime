import { useState } from 'react';
import type { AppSettings, ThemeId } from '../../types';
import { Download, Upload, Trash2, Copy, RefreshCw, Check, Palette, ChevronRight, X, MessageSquare } from 'lucide-react';
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
  onSubmitFeedback: (content: string) => Promise<void>;
  syncing: boolean;
  lastSyncedAt: string;
}

const THEME_OPTIONS: Array<{
  id: ThemeId;
  name: [string, string];
  description: [string, string];
  colors: [string, string, string];
}> = [
  { id: 'tomato', name: ['默认番茄', 'Classic Tomato'], description: ['番茄造型与温暖清爽配色', 'Tomato details in a warm, clean look'], colors: ['#ff6b6b', '#4caf50', '#ffffff'] },
  { id: 'liquidglass', name: ['液态玻璃', 'Liquid Glass'], description: ['流动高光、透明折射与柔和景深', 'Fluid highlights, refraction and depth'], colors: ['#7c5cff', '#5de1e6', '#eef4ff'] },
  { id: 'guohua', name: ['中国画', 'Chinese Painting'], description: ['青绿山水、绢本暖色与朱砂点睛', 'Mineral greens, silk paper and cinnabar'], colors: ['#315e50', '#c45b3f', '#eee3c8'] },
  { id: 'inkwash', name: ['水墨画', 'Ink Wash'], description: ['墨色层次、宣纸留白与淡雅晕染', 'Layered ink, rice paper and soft washes'], colors: ['#313638', '#70847b', '#f0ede4'] },
  { id: 'woodcut', name: ['版画雕刻', 'Woodcut Engraving'], description: ['粗粝刻线、套色印刷与强烈黑白', 'Carved lines and bold relief-print contrast'], colors: ['#191713', '#ad3d2f', '#e4d4b6'] },
  { id: 'metallic', name: ['金属质感', 'Metallic'], description: ['拉丝金属、冷光高亮与精密边框', 'Brushed metal, cool highlights and precision'], colors: ['#506374', '#b8c7cf', '#e8edf0'] },
  { id: 'stainedglass', name: ['彩色玻璃', 'Stained Glass'], description: ['教堂花窗、宝石色块与铅线分隔', 'Cathedral jewel tones and leaded panels'], colors: ['#7a2e9b', '#e6b83f', '#16233d'] },
  { id: 'tarot', name: ['塔罗牌', 'Tarot'], description: ['深蓝牌布、金线星月与复古纸牌底纹', 'Midnight card cloth, gold constellations and vintage grain'], colors: ['#b9934a', '#6d4ca5', '#14132c'] },
  { id: 'anime', name: ['动漫风格', 'Anime'], description: ['清亮赛璐璐色、柔光与活力线条', 'Bright cel colors and energetic highlights'], colors: ['#ff7096', '#5d8df7', '#f5f8ff'] },
  { id: 'farmcraft', name: ['星露谷·泰拉像素', 'Farm & Terra Pixels'], description: ['像素农田、木栅栏、作物与矿石冒险元素', 'Pixel farms, fences, crops and mineral adventures'], colors: ['#4f8f54', '#c7853c', '#f3d58a'] },
  { id: 'monochrome', name: ['黑白秩序', 'Monochrome'], description: ['纯黑白、高对比与网格秩序', 'Pure contrast and editorial grids'], colors: ['#111111', '#ffffff', '#dedede'] },
  { id: 'constructivist', name: ['苏联色块', 'Soviet Blocks'], description: ['红黑米白的构成主义几何', 'Red, black and cream geometry'], colors: ['#d62828', '#171717', '#f1e3c6'] },
  { id: 'toy3d', name: ['3D 潮玩', '3D Art Toy'], description: ['软糖配色、厚圆角与立体光影', 'Candy colors and sculpted depth'], colors: ['#7357ff', '#ff79b0', '#eff0ff'] },
  { id: 'oilpaint', name: ['油画质感', 'Oil Painting'], description: ['厚涂笔触、画布纹理与古典色彩', 'Canvas texture and layered brushwork'], colors: ['#8f3d2f', '#d49a45', '#eee0c4'] },
  { id: 'modernist', name: ['现代构成', 'Modern Composition'], description: ['红黄蓝几何与清晰留白', 'Bold geometry in red, yellow and blue'], colors: ['#e53935', '#174ea6', '#f6c945'] },
  { id: 'lineart', name: ['简笔画', 'Line Art'], description: ['轻线条、留白与随手涂鸦感', 'Airy lines and playful doodles'], colors: ['#202020', '#4d7ea8', '#fffdf7'] },
  { id: 'crayon', name: ['儿童蜡笔画', 'Kids Crayon'], description: ['纸张颗粒与明亮童趣蜡笔色', 'Bright crayon colors on textured paper'], colors: ['#ef5350', '#3569d4', '#ffd54f'] },
  { id: 'apple', name: ['苹果极简', 'Apple Minimal'], description: ['通透、克制的玻璃质感', 'Clean, calm frosted glass'], colors: ['#007aff', '#34c759', '#f5f5f7'] },
  { id: 'sketch', name: ['手绘纸张', 'Hand-drawn'], description: ['纸张纹理与自然线条', 'Paper texture and lively lines'], colors: ['#e05a47', '#2f766f', '#fffaf0'] },
  { id: 'pixel', name: ['像素游戏', 'Pixel Arcade'], description: ['方角、像素和游戏感', 'Blocky, playful arcade style'], colors: ['#ff4f69', '#5cd85a', '#fff4c2'] },
  { id: 'cyber', name: ['赛博霓虹', 'Cyber Neon'], description: ['深色网格与霓虹光效', 'Dark grids and neon glow'], colors: ['#00f5d4', '#ff2e88', '#101126'] },
  { id: 'matcha', name: ['抹茶自然', 'Matcha Calm'], description: ['柔和绿意与有机圆角', 'Soft greens and organic shapes'], colors: ['#6f8f52', '#b6cb87', '#f4f3e8'] },
  { id: 'ocean', name: ['海洋蓝调', 'Ocean Blue'], description: ['清澈蓝色与轻盈波浪', 'Fresh blues and airy waves'], colors: ['#087ea4', '#49b6c8', '#effaff'] },
  { id: 'ink', name: ['纸墨东方', 'Ink & Paper'], description: ['留白、纸色和朱砂点缀', 'Paper, ink and vermilion'], colors: ['#b83b2e', '#262521', '#f4efe3'] },
  { id: 'midnight', name: ['星夜深蓝', 'Midnight Stars'], description: ['静谧星空与蓝紫微光', 'Quiet starlight and indigo glow'], colors: ['#8b7cf6', '#4cc9f0', '#11162e'] },
];

export function SettingsPanel({ settings, onSave, onExport, onImport, onClear, onActivateSyncCode, onSubmitFeedback, syncing, lastSyncedAt }: SettingsPanelProps) {
  const { language, setLanguage, t } = useLanguage();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [syncCodeDraft, setSyncCodeDraft] = useState(settings.syncCode);
  const [codeMessage, setCodeMessage] = useState('');
  const [isNewCode, setIsNewCode] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => onSave({ ...settings, [key]: value });
  const msg = (zh: string, en: string) => language === 'zh-CN' ? zh : en;
  const copyIndex = language === 'zh-CN' ? 0 : 1;
  const currentTheme = THEME_OPTIONS.find(option => option.id === settings.theme) ?? THEME_OPTIONS[0];

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

  const submitFeedback = async () => {
    const content = feedbackText.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setFeedbackMessage('');
    try {
      await onSubmitFeedback(content);
      setFeedbackText('');
      setFeedbackMessage(msg('感谢反馈，已上传到你的数据仓库。', 'Thanks! Your feedback was uploaded to your data repo.'));
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      setFeedbackMessage(detail === 'Failed to fetch' ? msg('暂时无法连接同步服务，请检查网络后重试', 'Unable to reach sync. Check your connection and retry.') : detail || msg('提交失败，请稍后重试', 'Failed to submit. Please retry.'));
    } finally {
      setSubmitting(false);
    }
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
        <div className="settings-row">
          <label>{msg('主题风格', 'Theme style')}</label>
          <button className="theme-picker-trigger" type="button" onClick={() => setShowThemePicker(true)}>
            <span className="theme-trigger-palette" aria-hidden="true">
              <i style={{ backgroundColor: currentTheme.colors[0] }} />
              <i style={{ backgroundColor: currentTheme.colors[1] }} />
            </span>
            <strong>{currentTheme.name[copyIndex]}</strong>
            <ChevronRight size={15} />
          </button>
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

      <section className="settings-section">
        <h3>{t('feedback')}</h3>
        <p className="settings-hint">{t('feedbackHint')}</p>
        <button className="btn secondary" type="button" onClick={() => { setShowFeedback(true); setFeedbackMessage(''); }}><MessageSquare size={16} /> {t('submitFeedback')}</button>
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

      {showThemePicker && (
        <div className="modal-overlay" onClick={() => setShowThemePicker(false)}>
          <div className="modal-content theme-picker-modal" onClick={event => event.stopPropagation()}>
            <div className="theme-picker-modal-header">
              <span className="theme-heading-icon"><Palette size={17} /></span>
              <div>
                <h3 className="modal-title">{msg('选择主题风格', 'Choose a theme')}</h3>
                <p className="modal-desc">{msg('选择后立即切换，并同步到当前专属码。', 'Your selection applies instantly and syncs to this profile.')}</p>
              </div>
              <button className="theme-picker-close" type="button" aria-label={msg('关闭', 'Close')} onClick={() => setShowThemePicker(false)}><X size={18} /></button>
            </div>
            <div className="theme-gallery" aria-label={msg('主题风格', 'Theme styles')}>
              {THEME_OPTIONS.map(option => {
                const selected = settings.theme === option.id;
                return (
                  <button
                    className={`theme-option theme-preview-${option.id} ${selected ? 'selected' : ''}`}
                    type="button"
                    aria-pressed={selected}
                    key={option.id}
                    onClick={() => { update('theme', option.id); setShowThemePicker(false); }}
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
          </div>
        </div>
      )}

      {showFeedback && (
        <div className="modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="modal-content feedback-modal" onClick={event => event.stopPropagation()}>
            <h3 className="modal-title">{t('submitFeedback')}</h3>
            <p className="modal-desc">{t('feedbackHint')}</p>
            <textarea className="feedback-textarea" rows={5} maxLength={2000} autoFocus
              placeholder={t('feedbackPlaceholder')} value={feedbackText}
              onChange={event => setFeedbackText(event.target.value)} />
            <div className="modal-actions">
              <button className="modal-btn" type="button" onClick={() => setShowFeedback(false)}>{t('cancel')}</button>
              <button className="modal-btn primary" type="button" disabled={!feedbackText.trim() || submitting} onClick={() => void submitFeedback()}>
                {submitting ? t('submitting') : t('submit')}
              </button>
            </div>
            {feedbackMessage && <p className="settings-hint">{feedbackMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
