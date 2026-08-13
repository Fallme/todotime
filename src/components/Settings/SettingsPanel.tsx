import { useState } from 'react';
import type { AppSettings } from '../../types';
import { Download, Upload, Trash2, Copy, RefreshCw } from 'lucide-react';
import { createSyncCode, isValidSyncCode, normalizeSyncCode } from '../../utils/syncIdentity';
import type { SyncCodeMode } from '../Auth/SyncCodeGate';

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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [syncCodeDraft, setSyncCodeDraft] = useState(settings.syncCode);
  const [codeMessage, setCodeMessage] = useState('');
  const [isNewCode, setIsNewCode] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSave({ ...settings, [key]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
  };

  const activateCode = async (mode: SyncCodeMode) => {
    const code = normalizeSyncCode(syncCodeDraft);
    if (!isValidSyncCode(code)) {
      setCodeMessage('识别码至少 12 位，只能包含字母、数字、下划线和短横线');
      return;
    }
    setCodeMessage(mode === 'new' ? '正在创建独立数据空间…' : '正在加载该用户的数据…');
    try {
      await onActivateSyncCode(code, mode);
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      setCodeMessage(detail === 'Failed to fetch' ? '暂时无法连接同步服务，请检查网络后重试' : detail || '加载失败，请稍后重试');
    }
  };

  const createCode = () => {
    const code = createSyncCode();
    setSyncCodeDraft(code);
    setIsNewCode(true);
    setCodeVisible(true);
    setCodeMessage('新识别码已生成，请复制保存后点击“启用新识别码”');
  };

  return (
    <div className="settings-panel">
      <h2 className="settings-title">设置</h2>

      <section className="settings-section">
        <h3>计时器</h3>
        <div className="settings-row">
          <label>工作时长 (分钟)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={settings.workMinutes}
            onChange={e => update('workMinutes', Number(e.target.value))}
          />
        </div>
        <div className="settings-row">
          <label>短休息 (分钟)</label>
          <input
            type="number"
            min={1}
            max={30}
            value={settings.shortBreakMinutes}
            onChange={e => update('shortBreakMinutes', Number(e.target.value))}
          />
        </div>
        <div className="settings-row">
          <label>长休息 (分钟)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={settings.longBreakMinutes}
            onChange={e => update('longBreakMinutes', Number(e.target.value))}
          />
        </div>
        <div className="settings-row">
          <label>长休息间隔 (轮)</label>
          <input
            type="number"
            min={2}
            max={10}
            value={settings.longBreakInterval}
            onChange={e => update('longBreakInterval', Number(e.target.value))}
          />
        </div>
      </section>

      <section className="settings-section">
        <h3>通用</h3>
        <div className="settings-row toggle">
          <label>提示音</label>
          <button
            className={`toggle-btn ${settings.soundEnabled ? 'on' : ''}`}
            onClick={() => update('soundEnabled', !settings.soundEnabled)}
          >
            {settings.soundEnabled ? '开' : '关'}
          </button>
        </div>
        <div className="settings-row toggle">
          <label>深色模式</label>
          <button
            className={`toggle-btn ${settings.darkMode ? 'on' : ''}`}
            onClick={() => update('darkMode', !settings.darkMode)}
          >
            {settings.darkMode ? '开' : '关'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>个人数据同步</h3>
        <div className="settings-row">
          <label>个人同步识别码</label>
          <input
            type={codeVisible ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            placeholder="输入已有识别码，或点击创建"
            value={syncCodeDraft}
            onChange={e => { setSyncCodeDraft(normalizeSyncCode(e.target.value)); setIsNewCode(false); }}
          />
        </div>
        <div className="settings-actions" style={{ marginTop: 8 }}>
          <button className="btn secondary" type="button" onClick={createCode}>生成新识别码</button>
          <button className="btn secondary" type="button" onClick={() => setCodeVisible(value => !value)}>{codeVisible ? '隐藏' : '显示'}</button>
          <button className="btn secondary" type="button" disabled={!syncCodeDraft} onClick={() => { void navigator.clipboard.writeText(syncCodeDraft); setCodeMessage('识别码已复制，请妥善保存'); }}><Copy size={15} /> 复制</button>
          <button className="btn primary" type="button" disabled={syncing || !syncCodeDraft || !isNewCode} onClick={() => void activateCode('new')}>
            <RefreshCw size={15} className={syncing ? 'spin' : ''} />
            启用新识别码
          </button>
          <button className="btn secondary" type="button" disabled={syncing || !syncCodeDraft || syncCodeDraft === settings.syncCode} onClick={() => void activateCode('existing')}>
            加载已有识别码
          </button>
        </div>
        <div className="settings-row">
          <label>私有数据仓库</label>
          <input
            type="text"
            readOnly
            value={settings.githubRepo}
          />
        </div>
        <p className="settings-hint">
          每个识别码对应完全独立的任务、设置和统计文件。创建新码会从空白数据开始，不会复制当前用户数据；其他设备输入同一码后点击“加载已有识别码”。识别码等同于访问凭证，请勿分享，遗失后无法找回。
        </p>
        {codeMessage && <p className="settings-hint">{codeMessage}</p>}
        {lastSyncedAt && <p className="settings-hint">最近同步：{new Date(lastSyncedAt).toLocaleString()}</p>}
      </section>

      <div className="settings-actions">
        <button className="btn secondary" onClick={onExport}>
          <Download size={16} /> 导出数据
        </button>
        <label className="btn secondary">
          <Upload size={16} /> 导入数据
          <input type="file" accept=".json" onChange={handleFileChange} hidden />
        </label>
        {!showClearConfirm ? (
          <button className="btn danger" onClick={() => setShowClearConfirm(true)}>
            <Trash2 size={16} /> 清除数据
          </button>
        ) : (
          <div className="clear-confirm">
            <span>确认清除当前识别码在本机的数据并退出？云端数据及其他识别码不会删除。</span>
            <button className="btn danger small" onClick={() => { onClear(); setShowClearConfirm(false); }}>确认</button>
            <button className="btn secondary small" onClick={() => setShowClearConfirm(false)}>取消</button>
          </div>
        )}
      </div>
    </div>
  );
}
