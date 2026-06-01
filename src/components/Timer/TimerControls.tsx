import { Play, Pause, RotateCcw, SkipForward, Square } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onEndNow: () => void;
}

export function TimerControls({ isRunning, onStart, onPause, onReset, onSkip, onEndNow }: TimerControlsProps) {
  return (
    <div className="timer-controls">
      <button className="ctrl-btn secondary" onClick={onReset} title="新轮次">
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
      <button className="ctrl-btn secondary end-btn" onClick={onEndNow} title="结束并记录">
        <Square size={14} />
        <span>结束</span>
      </button>
    </div>
  );
}
