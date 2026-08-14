import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onNewRound: () => void;
  onSkip: () => void;
}

export function TimerControls({ isRunning, onStart, onPause, onNewRound, onSkip }: TimerControlsProps) {
  const { t } = useLanguage();
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
      <button className="ctrl-btn secondary" onClick={onSkip} title={t('skipStage')} aria-label={t('skipStage')}>
        <SkipForward size={18} />
      </button>
    </div>
  );
}
