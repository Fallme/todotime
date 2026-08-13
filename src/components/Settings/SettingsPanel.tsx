import { useState } from 'react';
import type { AppSettings } from '../../types';
import { Download, Upload, Trash2, Copy, RefreshCw } from 'lucide-react';
import { createSyncCode, isValidSyncCode, normalizeSyncCode } from '../../utils/syncIdentity';

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  onActivateSyncCode: (code: string, keepCurrentData: boolean) => Promise<void>;
  syncing: boolean;
  lastSyncedAt: string;
}

export function SettingsPanel({ settings, onSave, onExport, onImport, onClear, onActivateSyncCode, syncing, lastSyncedAt }: SettingsPanelProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [syncCodeDraft, setSyncCodeDraft] = useState(settings.syncCode);
  const [codeMessage, setCodeMessage] = useState('');

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSave({ ...settings, [key]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
  };

  const activateCode = async (keepCurrentData: boolean) => {
    const code = normalizeSyncCode(syncCodeDraft);
    if (!isValidSyncCode(code)) {
      setCodeMessage('识别码至少 12 位，只能包含字母、数字、下划线和短横线');
      return;
    }
    setCodeMessage(keepCurrentData ? '正在创建并保存当前数据…' : '正在加载该用户的数据…');
    await onActivateSyncCode(code, keepCurrentData);
    setSyncCodeDraft(code);
    setCodeMessage(keepCurrentData ? '识别码已创建，当前数据已归档到该用户' : '用户数据已加载');
  };

  const createCode = () => {
    const code = createSyncCode();
    setSyncCodeDraft(code);
    setCodeMessage('新识别码已生成，请点击“创建并保存”');
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
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="输入已有识别码，或点击创建"
            value={syncCodeDraft}
            onChange={e => setSyncCodeDraft(normalizeSyncCode(e.target.value))}
          />
        </div>
        <div className="settings-actions" style={{ marginTop: 8 }}>
          <button className="btn secondary" type="button" onClick={createCode}>创建识别码</button>
          <button className="btn secondary" type="button" disabled={!syncCodeDraft} onClick={() => navigator.clipboard.writeText(syncCodeDraft)}><Copy size={15} /> 复制</button>
          <button className="btn primary" type="button" disabled={syncing || !syncCodeDraft} onClick={() => void activateCode(true)}>
            <RefreshCw size={15} className={syncing ? 'spin' : ''} />
            创建并保存当前数据
          </button>
          <button className="btn secondary" type="button" disabled={syncing || !syncCodeDraft || syncCodeDraft === settings.syncCode} onClick={() => void activateCode(false)}>
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
          每个识别码对应完全独立的任务、设置和统计文件。新用户点击“创建识别码”后保存；其他设备输入同一码即可加载。识别码无法找回，请自行妥善保存。
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
            <span>确认清除所有本地数据？</span>
            <button className="btn danger small" onClick={() => { onClear(); setShowClearConfirm(false); }}>确认</button>
            <button className="btn secondary small" onClick={() => setShowClearConfirm(false)}>取消</button>
          </div>
        )}
      </div>
    </div>
  );
}
