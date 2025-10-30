import type { ExtractedFrame } from '../extractFramesNative';

interface FramePreviewProps {
  frame: ExtractedFrame | null;
}

function FramePreview({ frame }: FramePreviewProps) {
  if (!frame) return null;

  return (
    <div
      style={{
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'center',
      }}>
      <div
        style={{
          maxWidth: '500px',
          maxHeight: '500px',
          width: '100%',
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
        <img
          src={frame.data}
          alt={`Frame at ${frame.timestamp.toFixed(1)}s`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
    </div>
  );
}

export default FramePreview;
