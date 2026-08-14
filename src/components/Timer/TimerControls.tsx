import { Play, Pause, SkipForward, RotateCcw, Zap } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onNewRound: () => void;
  onSkip: () => void;
  onFinishRound: () => void;
}

export function TimerControls({ isRunning, onStart, onPause, onNewRound, onSkip, onFinishRound }: TimerControlsProps) {
  const { language, t } = useLanguage();
  const quickComplete = language === 'zh-CN' ? '快速完成' : 'Finish round';
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
      <button className="ctrl-btn quick-finish" onClick={onFinishRound} title={quickComplete}>
        <Zap size={16} />
        <span>{quickComplete}</span>
      </button>
      <button className="ctrl-btn secondary" onClick={onSkip} title={t('skipStage')}>
        <SkipForward size={18} />
      </button>
    </div>
  );
}
