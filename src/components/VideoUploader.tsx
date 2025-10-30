interface VideoUploaderProps {
  selectedFile: File | null;
  isProcessing: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
}

function VideoUploader({ selectedFile, isProcessing, onFileChange, onProcess }: VideoUploaderProps) {
  return (
    <div style={{ margin: '20px 0' }}>
      <label
        htmlFor="videoInput"
        style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
        Select a video file:
      </label>
      <input
        type="file"
        accept="video/*"
        id="videoInput"
        onChange={onFileChange}
        disabled={isProcessing}
        style={{
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginBottom: '12px',
        }}
      />
      <button
        onClick={onProcess}
        disabled={!selectedFile || isProcessing}
        style={{
          padding: '10px 24px',
          background: !selectedFile || isProcessing ? '#ccc' : '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: !selectedFile || isProcessing ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          marginLeft: 10,
        }}>
        {isProcessing
          ? 'Processing...'
          : selectedFile
          ? `Process ${selectedFile.name}`
          : 'Process Video'}
      </button>
    </div>
  );
}

export default VideoUploader;
