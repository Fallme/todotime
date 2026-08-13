import { useState } from 'react';
import type { AppSettings } from '../../types';
import { Download, Upload, Trash2 } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
}

export function SettingsPanel({ settings, onSave, onExport, onImport, onClear }: SettingsPanelProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSave({ ...settings, [key]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
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
        <h3>GitHub JSON 同步</h3>
        <div className="settings-row">
          <label>个人同步密码</label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="各设备填写相同密码"
            value={settings.syncSecret}
            onChange={e => update('syncSecret', e.target.value)}
          />
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
          GitHub Token 只保存在服务端。代码仓库与私人数据仓库完全分离，各设备只需填写相同同步密码。
        </p>
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
