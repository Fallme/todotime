import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onNewRound: () => void;
  onSkip: () => void;
}

export function TimerControls({ isRunning, onStart, onPause, onNewRound, onSkip }: TimerControlsProps) {
  return (
    <div className="timer-controls">
      <button className="ctrl-btn secondary" onClick={onNewRound} title="结束本轮，开始新轮次">
        <RotateCcw size={18} />
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
      <button className="ctrl-btn secondary" onClick={onSkip} title="跳过当前阶段">
        <SkipForward size={18} />
      </button>
    </div>
  );
}
