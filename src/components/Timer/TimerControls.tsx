import { Play, Pause, RotateCcw, SkipForward, Zap } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  taskFocusMode: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onStartTaskFocus: () => void;
  onStopTaskFocus: () => void;
}

export function TimerControls({
  isRunning, taskFocusMode,
  onStart, onPause, onReset, onSkip,
  onStartTaskFocus, onStopTaskFocus,
}: TimerControlsProps) {
  if (taskFocusMode) {
    return (
      <div className="timer-controls">
        <button className="ctrl-btn secondary" onClick={onStopTaskFocus} title="结束专注">
          <RotateCcw size={20} />
        </button>
        <button className="ctrl-btn primary" onClick={onStopTaskFocus}>
          <Pause size={24} />
          <span>结束</span>
        </button>
        <button className="ctrl-btn secondary" onClick={onSkip} title="跳过分配">
          <SkipForward size={20} />
        </button>
      </div>
    );
  }

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
        <div className="ctrl-btn-group">
          <button className="ctrl-btn primary" onClick={onStart}>
            <Play size={24} />
            <span>开始</span>
          </button>
          <button className="ctrl-btn task-focus" onClick={onStartTaskFocus} title="任务专注：不限时">
            <Zap size={16} />
            <span>任务专注</span>
          </button>
        </div>
      )}
      {isRunning && (
        <button className="ctrl-btn secondary" onClick={onSkip} title="跳过">
          <SkipForward size={20} />
        </button>
      )}
    </div>
  );
}
