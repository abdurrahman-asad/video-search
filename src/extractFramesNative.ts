/**
 * Video Frame Extractor using Native HTML5 Video + Canvas
 * Works with browser-supported codecs (H.264, VP8, VP9)
 */

import FrameEncoderWorker from './encoder?worker';

export interface FrameExtractionOptions {
  /** Quality of JPEG compression (0-1, higher is better). Default: 0.8 */
  quality?: number;
  /** Maximum width for extracted frames. Default: 1280 */
  maxWidth?: number;
  /** Maximum height for extracted frames. Default: 720 */
  maxHeight?: number;
  /** Extract one frame every N seconds. Default: 1 */
  frameInterval?: number;
}

export interface ExtractedFrame {
  /** Frame data as Blob URL */
  data: string;
  /** Timestamp in seconds */
  timestamp: number;
  /** Original blob for cleanup */
  blob?: Blob;
}

export interface ExtractionProgress {
  /** Number of frames extracted so far */
  framesExtracted: number;
  /** Current timestamp being processed (seconds) */
  currentTime: number;
  /** Total video duration (seconds) */
  totalDuration: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Loading status message */
  status?: string;
}

/**
 * Extract frames from a video file using native browser APIs
 * Memory-efficient for large files - only decodes frames on demand
 */
export class NativeVideoFrameExtractor {
  private options: Required<FrameExtractionOptions>;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private worker: Worker | null = null;

  constructor(options: FrameExtractionOptions = {}) {
    this.options = {
      quality: options.quality ?? 1,
      maxWidth: options.maxWidth ?? 1024,
      maxHeight: options.maxHeight ?? 1024,
      frameInterval: options.frameInterval ?? 1,
    };
  }

  /**
   * Extract frames from a video file
   */
  async extractFrames(
    file: File,
    onProgress?: (progress: ExtractionProgress) => void,
    onFrame?: (frame: ExtractedFrame) => void,
  ): Promise<ExtractedFrame[]> {
    const frames: ExtractedFrame[] = [];
    const bitmapBatch: ImageBitmap[] = [];

    try {
      this.worker = new FrameEncoderWorker();
      // Create video element
      this.video = document.createElement('video');
      this.video.preload = 'auto';
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.crossOrigin = 'anonymous';

      const metadata = await this.loadVideo(file);
      const duration = metadata.duration;

      // Create canvas for frame extraction
      this.setupCanvas(metadata.width, metadata.height);

      if (!this.canvas || !this.ctx) {
        throw new Error('Failed to create canvas');
      }

      // Extract frames by seeking through video
      const totalFrames = Math.floor(duration / this.options.frameInterval);
      let framesExtracted = 0;
      let consecutiveFailures = 0;
      const MAX_CONSECUTIVE_FAILURES = 3;
      const FLUSH_INTERVAL = 120; // Flush memory every 120 frames

      for (let i = 0; i < totalFrames; i++) {
        const timestamp = i * this.options.frameInterval;

        try {
          await this.seekWithRetry(timestamp, file);
          // Wait for video to be ready - check readyState
          if (this.video.readyState < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          // Verify video element has valid dimensions
          if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
            throw new Error('Video dimensions not available');
          }

          // Draw frame to canvas
          this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

          // Create low-quality data URL for display
          const dataURL = this.canvas.toDataURL('image/jpeg', 0.3);

          // Convert canvas to ImageBitmap for worker encoding
          const bitmap = await createImageBitmap(this.canvas);
          bitmapBatch.push(bitmap);

          // Create placeholder frame for display
          const extractedFrame: ExtractedFrame = {
            data: dataURL,
            timestamp,
            blob: undefined, // Will be filled when batch is encoded
          };
          frames.push(extractedFrame);
          framesExtracted++;
          consecutiveFailures = 0; // Reset on success

          if (onFrame) {
            onFrame(extractedFrame);
          }

          if (onProgress) {
            onProgress({
              framesExtracted,
              currentTime: timestamp,
              totalDuration: duration,
              progress: ((i + 1) / totalFrames) * 100,
            });
          }

          // Flush internal frames array to free memory
          if (framesExtracted > 0 && framesExtracted % FLUSH_INTERVAL === 0) {
            console.log(
              `Encoding batch of ${bitmapBatch.length} frames at frame ${framesExtracted}`,
            );

            // Send batch to worker for encoding
            const blobs = await this.encodeBatch(bitmapBatch, i - bitmapBatch.length);

            console.log(`Flushing ${frames.length} frames from extractor memory`);
            frames.length = 0;
            bitmapBatch.length = 0;
          }

          // Add small delay at every FLUSH_INTERVAL to prevent browser throttling
          if (i > 0 && i % FLUSH_INTERVAL === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (frameError) {
          consecutiveFailures++;
          // If too many consecutive failures, stop
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            throw new Error(
              `Failed to extract frames after ${consecutiveFailures} consecutive failures. Last error: ${frameError}`,
            );
          }
          console.log(`Skipping frame at ${timestamp}s, continuing...`);
        }
      }

      // Encode any remaining frames in the batch
      if (bitmapBatch.length > 0) {
        console.log(`Encoding final batch of ${bitmapBatch.length} frames`);

        const blobs = await this.encodeBatch(bitmapBatch, totalFrames - bitmapBatch.length);

        bitmapBatch.length = 0;
      }

      return frames;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Frame extraction aborted');
      }
      throw error;
    } finally {
      this.cleanup();
    }
  }

  /**
   * Load video and get metadata
   */
  private async loadVideo(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.video) {
        reject(new Error('Video element not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Video loading timeout'));
      }, 30000);

      this.video.onloadedmetadata = () => {
        clearTimeout(timeout);

        resolve({
          duration: this.video!.duration,
          width: this.video!.videoWidth,
          height: this.video!.videoHeight,
        });
      };

      this.video.onerror = () => {
        clearTimeout(timeout);
        const error = this.video?.error;
        const errorMessage = error
          ? `Failed to load video (code ${error.code}): ${error.message}`
          : 'Failed to load video. Format may not be supported.';
        reject(new Error(errorMessage));
      };

      this.video.src = URL.createObjectURL(file);
      this.video.load();
    });
  }

  /**
   * Reinitialize video element (useful after decode errors)
   */
  private async reinitializeVideo(file: File): Promise<void> {
    console.log('Reinitializing video element...');

    // Clean up old video
    if (this.video) {
      if (this.video.src) {
        URL.revokeObjectURL(this.video.src);
      }
      this.video.onloadedmetadata = null;
      this.video.onseeked = null;
      this.video.onerror = null;
      this.video.src = '';
      this.video.load();
    }

    // Small delay to let browser clean up
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create new video element
    this.video = document.createElement('video');
    this.video.preload = 'auto';
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.crossOrigin = 'anonymous';

    // Reload video
    await this.loadVideo(file);
  }

  private async encodeBatch(bitmaps: ImageBitmap[], startingIndex: number) {
    console.log(`Encoding batch starting at index ${startingIndex} with ${bitmaps.length} frames`);

    return new Promise<Blob[]>(resolve => {
      this.worker!.onmessage = e => resolve(e.data);
      this.worker!.postMessage({ bitmaps, startingIndex }, bitmaps); // transfer ownership
    });
  }

  /**
   * Setup canvas with appropriate dimensions
   */
  private setupCanvas(videoWidth: number, videoHeight: number): void {
    this.canvas = document.createElement('canvas');

    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = videoWidth / videoHeight;
    let width = videoWidth;
    let height = videoHeight;

    if (width > this.options.maxWidth) {
      width = this.options.maxWidth;
      height = width / aspectRatio;
    }

    if (height > this.options.maxHeight) {
      height = this.options.maxHeight;
      width = height * aspectRatio;
    }

    this.canvas.width = Math.round(width);
    this.canvas.height = Math.round(height);
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Seek to specific time in video with retry and reinitialization
   */
  private async seekWithRetry(timestamp: number, file: File): Promise<void> {
    const MAX_SEEK_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_SEEK_RETRIES; attempt++) {
      try {
        await this.seekToTime(timestamp);
        return; // Success, exit function
      } catch (seekError) {
        console.warn(
          `Seek failed at ${timestamp}s (attempt ${attempt}/${MAX_SEEK_RETRIES})`,
          seekError,
        );

        if (attempt < MAX_SEEK_RETRIES) {
          // Reinitialize video and try again
          await this.reinitializeVideo(file);
          // Add a small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          // All retries exhausted
          throw new Error(
            `Failed to seek to ${timestamp}s after ${MAX_SEEK_RETRIES} attempts. Last error: ${seekError}`,
          );
        }
      }
    }
  }

  /**
   * Seek to specific time in video
   */
  private async seekToTime(time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.video) {
        reject(new Error('Video element not initialized'));
        return;
      }

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Seek timeout'));
      }, 5000);

      const onSeeked = () => {
        clearTimeout(timeout);
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        const error = this.video?.error;
        const errorMessage = error
          ? `Media error (code ${error.code}): ${error.message}`
          : 'Failed to seek to time';
        reject(new Error(errorMessage));
      };

      this.video.onseeked = onSeeked;
      this.video.onerror = onError;

      // Ensure time is within bounds
      const clampedTime = time >= this.video.duration ? this.video.duration - 0.1 : time;
      this.video.currentTime = clampedTime;
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.video) {
      if (this.video.src) {
        URL.revokeObjectURL(this.video.src);
      }
      this.video.onloadedmetadata = null;
      this.video.onseeked = null;
      this.video.onerror = null;
      this.video = null;
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.canvas = null;
    this.ctx = null;
  }
}
