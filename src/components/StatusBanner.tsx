interface StatusBannerProps {
  isSupported: boolean;
  threads?: number; // Optional for backwards compatibility
}

function StatusBanner({ isSupported }: StatusBannerProps) {
  return (
    <div
      style={{
        padding: '10px',
        margin: '10px 0',
        borderRadius: '4px',
        background: isSupported ? '#d4edda' : '#fff3cd',
        color: isSupported ? '#155724' : '#856404',
      }}
    >
      {isSupported ? (
        '✓ Native video processing ready - Memory-efficient for large files'
      ) : (
        '⚠ Video playback not supported in this browser. Please use a modern browser.'
      )}
    </div>
  );
}

export default StatusBanner;
