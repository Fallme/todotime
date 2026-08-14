import { Play, Pause, SkipForward, RotateCcw, Zap } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TimerMode } from '../../types';

interface TimerControlsProps {
  mode: TimerMode;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onNewRound: () => void;
  onSkip: () => void;
  onFinishRound: () => void;
}

export function TimerControls({ mode, isRunning, onStart, onPause, onNewRound, onSkip, onFinishRound }: TimerControlsProps) {
  const { language, t } = useLanguage();
  const finishRound = language === 'zh-CN' ? '完成本轮' : 'Complete round';
  const finishRoundTitle = language === 'zh-CN' ? '立即按本轮完整时长结算' : 'Settle the full planned round now';
  return (
    <div className="timer-controls">
      <button className="ctrl-btn secondary" onClick={onNewRound} title={t('endRound')}>
        <RotateCcw size={18} />
      </button>
      {isRunning ? (
        <button className="ctrl-btn primary" onClick={onPause}>
          <Pause size={24} />
          <span>{t('pause')}</span>
        </button>
      ) : (
        <button className="ctrl-btn primary" onClick={onStart}>
          <Play size={24} />
          <span>{t('start')}</span>
        </button>
      )}
      {mode === 'work' && (
        <button className="ctrl-btn quick-finish" onClick={onFinishRound} title={finishRoundTitle}>
          <Zap size={16} />
          <span>{finishRound}</span>
        </button>
      )}
      <button className="ctrl-btn secondary" onClick={onSkip} title={t('skipStage')}>
        <SkipForward size={18} />
      </button>
    </div>
  );
}
