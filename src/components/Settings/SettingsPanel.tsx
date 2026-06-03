import { useState, useEffect } from 'react';
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
  const [form, setForm] = useState(settings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Auto-save: when form changes, immediately save
  useEffect(() => {
    onSave(form);
  }, [form, onSave]);

  // Sync form when settings change externally (e.g. git sync)
  useEffect(() => {
    setForm(settings);
  }, [settings]);

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
            value={form.workMinutes}
            onChange={e => setForm(f => ({ ...f, workMinutes: Number(e.target.value) }))}
          />
        </div>
        <div className="settings-row">
          <label>短休息 (分钟)</label>
          <input
            type="number"
            min={1}
            max={30}
            value={form.shortBreakMinutes}
            onChange={e => setForm(f => ({ ...f, shortBreakMinutes: Number(e.target.value) }))}
          />
        </div>
        <div className="settings-row">
          <label>长休息 (分钟)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={form.longBreakMinutes}
            onChange={e => setForm(f => ({ ...f, longBreakMinutes: Number(e.target.value) }))}
          />
        </div>
        <div className="settings-row">
          <label>长休息间隔 (轮)</label>
          <input
            type="number"
            min={2}
            max={10}
            value={form.longBreakInterval}
            onChange={e => setForm(f => ({ ...f, longBreakInterval: Number(e.target.value) }))}
          />
        </div>
      </section>

      <section className="settings-section">
        <h3>通用</h3>
        <div className="settings-row toggle">
          <label>提示音</label>
          <button
            className={`toggle-btn ${form.soundEnabled ? 'on' : ''}`}
            onClick={() => setForm(f => ({ ...f, soundEnabled: !f.soundEnabled }))}
          >
            {form.soundEnabled ? '开' : '关'}
          </button>
        </div>
        <div className="settings-row toggle">
          <label>深色模式</label>
          <button
            className={`toggle-btn ${form.darkMode ? 'on' : ''}`}
            onClick={() => setForm(f => ({ ...f, darkMode: !f.darkMode }))}
          >
            {form.darkMode ? '开' : '关'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>GitHub 同步</h3>
        <div className="settings-row">
          <label>Personal Access Token</label>
          <input
            type="password"
            placeholder="ghp_xxxxx"
            value={form.githubToken}
            onChange={e => setForm(f => ({ ...f, githubToken: e.target.value }))}
          />
        </div>
        <div className="settings-row">
          <label>仓库 (owner/repo)</label>
          <input
            type="text"
            placeholder="Fallme/todotime"
            value={form.githubRepo}
            onChange={e => setForm(f => ({ ...f, githubRepo: e.target.value }))}
          />
        </div>
        <p className="settings-hint">
          需要 repo 权限的 PAT，数据将以 JSON 文件自动提交到仓库的 data/ 目录
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
