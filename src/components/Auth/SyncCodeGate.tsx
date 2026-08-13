import { useState } from 'react';
import { CheckCircle2, Copy, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { createSyncCode, isValidSyncCode, normalizeSyncCode } from '../../utils/syncIdentity';

export type SyncCodeMode = 'existing' | 'new';

interface SyncCodeGateProps {
  onActivate: (code: string, mode: SyncCodeMode) => Promise<void>;
}

export function SyncCodeGate({ onActivate }: SyncCodeGateProps) {
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
    setMessage('这是你的新专属码。请先复制保存，再进入 TodoTime。');
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setMessage('专属码已复制。请存放在安全的位置。');
    } catch {
      setVisible(true);
      setMessage('自动复制失败，请长按或选中专属码手动复制。');
    }
  };

  const activate = async () => {
    const normalized = normalizeSyncCode(code);
    if (!isValidSyncCode(normalized)) {
      setMessage('请输入有效专属码：至少 12 位，仅包含字母、数字、短横线或下划线。');
      return;
    }
    if (mode === 'new' && !copied) {
      setMessage('请先复制并保存新专属码，避免以后无法找回数据。');
      return;
    }

    setBusy(true);
    setMessage(mode === 'existing' ? '正在确认并加载你的数据…' : '正在创建独立数据空间…');
    try {
      await onActivate(normalized, mode);
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      setMessage(detail === 'Failed to fetch'
        ? '暂时无法连接同步服务，请检查网络后重试。'
        : detail || '暂时无法加载，请稍后重试。');
      setBusy(false);
    }
  };

  return (
    <main className="sync-gate">
      <section className="sync-gate-card" aria-labelledby="sync-gate-title">
        <div className="sync-gate-brand">
          <span className="sync-gate-logo"><KeyRound size={24} aria-hidden="true" /></span>
          <span>TodoTime</span>
        </div>
        <div className="sync-gate-heading">
          <p className="sync-gate-kicker">你的专注，只属于你</p>
          <h1 id="sync-gate-title">输入个人专属码</h1>
          <p>同一个码可在你的多台设备同步；不同码的任务、番茄记录、统计和设置完全分开。</p>
        </div>

        <div className="sync-gate-tabs" role="tablist" aria-label="专属码使用方式">
          <button type="button" role="tab" aria-selected={mode === 'existing'} className={mode === 'existing' ? 'active' : ''}
            onClick={() => { setMode('existing'); setCode(''); setCopied(false); setMessage(''); }}>
            我已有专属码
          </button>
          <button type="button" role="tab" aria-selected={mode === 'new'} className={mode === 'new' ? 'active' : ''}
            onClick={generateCode}>
            创建新专属码
          </button>
        </div>

        <label className="sync-code-label" htmlFor="sync-code-input">
          {mode === 'existing' ? '专属码' : '新专属码'}
        </label>
        <div className="sync-code-field">
          <input id="sync-code-input" type={visible ? 'text' : 'password'} value={code}
            autoCapitalize="characters" autoComplete="off" spellCheck={false}
            placeholder="例如 TT-XXXXX-XXXXX-XXXXX-XXXXX"
            onChange={event => { setCode(normalizeSyncCode(event.target.value)); setMode('existing'); setCopied(false); setMessage(''); }}
            onKeyDown={event => { if (event.key === 'Enter') void activate(); }}
            aria-describedby="sync-code-message" />
          <button type="button" className="sync-code-icon-btn" onClick={() => setVisible(value => !value)} aria-label={visible ? '隐藏专属码' : '显示专属码'}>
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
          {mode === 'new' && (
            <button type="button" className="sync-code-icon-btn" onClick={() => void copyCode()} aria-label="复制专属码">
              {copied ? <CheckCircle2 size={19} /> : <Copy size={19} />}
            </button>
          )}
        </div>

        <button type="button" className="sync-gate-primary" disabled={busy || !code} onClick={() => void activate()}>
          {busy ? '正在处理…' : mode === 'existing' ? '进入我的 TodoTime' : '保存专属码并开始'}
        </button>
        <button type="button" className="sync-gate-create" onClick={generateCode}>
          {mode === 'new' ? '重新生成一个码' : '没有专属码？立即创建'}
        </button>

        <p id="sync-code-message" className={`sync-gate-message ${message ? 'show' : ''}`} aria-live="polite">{message}</p>
        <div className="sync-gate-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p><strong>请妥善保存专属码</strong><span>它相当于数据钥匙，遗失后无法找回；知道该码的人也能访问对应数据。</span></p>
        </div>
      </section>
    </main>
  );
}
