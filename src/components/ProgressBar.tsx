import type { ExtractionProgress } from '../extractFrames';

interface ProgressBarProps {
  progress: ExtractionProgress;
}

function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div style={{ margin: '20px 0' }}>
      <div style={{ marginBottom: '10px' }}>
        <strong>Processing video...</strong>
      </div>
      <div
        style={{
          width: '100%',
          background: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(progress.progress, 100)}%`,
            height: '24px',
            background: '#4CAF50',
            transition: 'width 0.3s',
          }}
        />
      </div>
      <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
        {progress.status || (
          `Extracted ${progress.framesExtracted} frames | ${progress.currentTime.toFixed(1)}s / ${progress.totalDuration.toFixed(1)}s`
        )}
      </div>
    </div>
  );
}

export default ProgressBar;
