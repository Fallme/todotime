import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export function TimerControls({ isRunning, onStart, onPause, onReset, onSkip }: TimerControlsProps) {
  return (
    <div className="timer-controls">
      <button className="ctrl-btn secondary" onClick={onReset} title="重置">
        <RotateCcw size={20} />
      </button>
      {isRunning ? (
        <button className="ctrl-btn primary" onClick={onPause}>
          <Pause size={24} />
          <span>暂停</span>
        </button>
      ) : (
        <button className="ctrl-btn primary" onClick={onStart}>
          <Play size={24} />
          <span>开始</span>
        </button>
      )}
      <button className="ctrl-btn secondary" onClick={onSkip} title="跳过">
        <SkipForward size={20} />
      </button>
    </div>
  );
}
