import { useState, useMemo } from 'react';
import {
  NativeVideoFrameExtractor,
  type ExtractedFrame,
  type ExtractionProgress,
} from '../extractFramesNative';
import VideoUploader from './VideoUploader';
import ProgressBar from './ProgressBar';
import ErrorMessage from './ErrorMessage';
import Results from './Results';
import FramePreview from './FramePreview';

function VideoProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<ExtractedFrame | null>(null);
  const [progress, setProgress] = useState<ExtractionProgress>({
    framesExtracted: 0,
    currentTime: 0,
    totalDuration: 0,
    progress: 0,
  });
  const [results, setResults] = useState<{
    totalFrames: number;
    processingTime: string;
    totalSizeKB: number;
    avgSizePerFrame: number;
  } | null>(null);
  const extractor = useMemo(() => new NativeVideoFrameExtractor(), []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setError(null);
    setResults(null);
    setCurrentFrame(null);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress({ framesExtracted: 0, currentTime: 0, totalDuration: 0, progress: 0 });

    try {
      const startTime = performance.now();

      const onProgress = (prog: ExtractionProgress) => {
        setProgress(prog);
      };

      const onFrame = (frame: ExtractedFrame) => {
        // Only keep the latest frame
        setCurrentFrame(frame);
      };

      const extractedFrames = await extractor.extractFrames(selectedFile, onProgress, onFrame);

      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // Calculate total size from blobs
      const totalSizeKB = extractedFrames.reduce(
        (sum, frame) => sum + (frame.blob ? frame.blob.size / 1024 : 0),
        0,
      );

      setResults({
        totalFrames: extractedFrames.length,
        processingTime: duration,
        totalSizeKB,
        avgSizePerFrame: totalSizeKB / extractedFrames.length,
      });
    } catch (err) {
      console.error('Error extracting frames:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <VideoUploader
        selectedFile={selectedFile}
        isProcessing={isProcessing}
        onFileChange={handleFileChange}
        onProcess={handleProcess}
      />

      <div style={{ margin: '20px 0' }}>
        {isProcessing && progress.currentTime > 0 && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '14px',
              color: '#666',
            }}>
            Currently processing: {progress.currentTime.toFixed(1)}s /{' '}
            {progress.totalDuration.toFixed(1)}s
          </div>
        )}
      </div>

      {isProcessing && <ProgressBar progress={progress} />}

      {error && <ErrorMessage error={error} />}

      {results && <Results results={results} />}

      <FramePreview frame={currentFrame} />
    </div>
  );
}

export default VideoProcessor;
