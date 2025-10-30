/**
 * Video Frame Extractor using FFmpeg
 * Efficiently processes large videos by extracting one frame per second
 * and compressing them for LLM processing
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

export interface FrameExtractionOptions {
  /** Quality of JPEG compression (2-31, lower is better). Default: 2 */
  quality?: number;
  /** Maximum width for extracted frames. Default: 1280 */
  maxWidth?: number;
  /** Maximum height for extracted frames. Default: 720 */
  maxHeight?: number;
  /** Extract one frame every N seconds. Default: 1 */
  frameInterval?: number;
}

export interface ExtractedFrame {
  /** Frame data as base64 encoded JPEG */
  data: string;
  /** Timestamp in seconds */
  timestamp: number;
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
  /** Loading status message (e.g., "Downloading FFmpeg...") */
  status?: string;
}

/**
 * Extract frames from a video file using FFmpeg
 * Processes video efficiently to handle large files
 */
export class VideoFrameExtractor {
  private options: Required<FrameExtractionOptions>;
  private ffmpeg: FFmpeg | null = null;
  private abortController: AbortController | null = null;

  constructor(options: FrameExtractionOptions = {}) {
    this.options = {
      quality: options.quality ?? 1,
      maxWidth: options.maxWidth ?? 1024,
      maxHeight: options.maxHeight ?? 1024,
      frameInterval: options.frameInterval ?? 1,
    };
  }

  /**
   * Check if SharedArrayBuffer is available for multi-threading
   */
  static isSupported(): boolean {
    // Check for SharedArrayBuffer support (required for multi-threading)
    return typeof SharedArrayBuffer !== 'undefined';
  }

  /**
   * Initialize FFmpeg
   */
  private async loadFFmpeg(onLoadProgress?: (message: string) => void): Promise<void> {
    if (!this.ffmpeg) {
      this.ffmpeg = new FFmpeg();
    }

    // // Set up logging for progress
    // this.ffmpeg.on('log', ({ message }) => {
    //   console.log('[FFmpeg]', message);
    // });

    // Load FFmpeg with multi-threading support
    const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.10/dist/esm';

    if (onLoadProgress) {
      onLoadProgress('Downloading FFmpeg core (~31MB)...');
    }

    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');

    if (onLoadProgress) {
      onLoadProgress('Downloading FFmpeg WebAssembly...');
    }

    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

    if (onLoadProgress) {
      onLoadProgress('Downloading FFmpeg worker...');
    }

    const workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript');

    if (onLoadProgress) {
      onLoadProgress('Initializing FFmpeg...');
    }

    try {
      await this.ffmpeg.load({
        coreURL,
        wasmURL,
        workerURL,
      });

      if (onLoadProgress) {
        onLoadProgress('FFmpeg ready!');
      }
    } finally {
      // Revoke blob URLs after FFmpeg is loaded to free memory
      URL.revokeObjectURL(coreURL);
      URL.revokeObjectURL(wasmURL);
      URL.revokeObjectURL(workerURL);
    }
  }

  /**
   * Extract frames from a video file
   */
  async extractFrames(
    file: File,
    onProgress?: (progress: ExtractionProgress) => void,
    onFrame?: (frame: ExtractedFrame) => void,
  ): Promise<ExtractedFrame[]> {
    this.abortController = new AbortController();
    const frames: ExtractedFrame[] = [];

    try {
      // Load FFmpeg with progress updates
      await this.loadFFmpeg(message => {
        if (onProgress) {
          onProgress({
            framesExtracted: 0,
            currentTime: 0,
            totalDuration: 0,
            progress: 0,
            status: message,
          });
        }
      });

      if (!this.ffmpeg) throw new Error('FFmpeg failed to load');

      // Get video metadata
      if (onProgress) {
        onProgress({
          framesExtracted: 0,
          currentTime: 0,
          totalDuration: 0,
          progress: 0,
          status: 'Reading video metadata...',
        });
      }

      const metadata = await this.getVideoMetadata(file);
      const duration = metadata.duration;

      // Write input file to FFmpeg filesystem
      if (onProgress) {
        onProgress({
          framesExtracted: 0,
          currentTime: 0,
          totalDuration: duration,
          progress: 0,
          status: 'Uploading video to FFmpeg...',
        });
      }

      const inputFileName = 'input.mp4';
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

      // Calculate scale filter to maintain aspect ratio
      const scaleFilter = `scale='min(${this.options.maxWidth},iw)':'min(${this.options.maxHeight},ih)':force_original_aspect_ratio=decrease`;

      // Extract frames at specified interval
      // fps=1/${frameInterval} extracts one frame every N seconds
      const outputPattern = 'frame_%04d.jpg';
      const fps = 1 / this.options.frameInterval;

      // Use multi-threading for faster processing
      const threads = navigator.hardwareConcurrency || 4;

      await this.ffmpeg.exec([
        '-threads',
        threads.toString(),
        '-i',
        inputFileName,
        '-vf',
        `fps=${fps},${scaleFilter}`,
        '-q:v',
        this.options.quality.toString(),
        outputPattern,
      ]);

      // Read all extracted frames
      const files = await this.ffmpeg.listDir('/');
      const frameFiles = files
        .filter((f: any) => f.name.startsWith('frame_') && f.name.endsWith('.jpg'))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      let framesExtracted = 0;

      for (const frameFile of frameFiles) {
        if (this.abortController.signal.aborted) break;

        const frameData = (await this.ffmpeg.readFile(frameFile.name)) as Uint8Array;

        const base64 = await this.uint8ArrayToBase64(frameData);

        const timestamp = framesExtracted * this.options.frameInterval;

        const extractedFrame: ExtractedFrame = {
          data: base64,
          timestamp,
        };

        frames.push(extractedFrame);
        framesExtracted++;

        // Call callbacks
        if (onFrame) {
          onFrame(extractedFrame);
        }

        if (onProgress) {
          onProgress({
            framesExtracted,
            currentTime: timestamp,
            totalDuration: duration,
            progress: Math.min((timestamp / duration) * 100, 100),
          });
        }

        // Clean up frame file from memory
        await this.ffmpeg.deleteFile(frameFile.name);
      }

      // Clean up input file
      await this.ffmpeg.deleteFile(inputFileName);

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
   * Stop the extraction process
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Get video metadata using a video element
   */
  private async getVideoMetadata(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Convert Uint8Array to base64 string using FileReader (fastest method)
   * Avoids string concatenation and uses native browser API
   */
  private async uint8ArrayToBase64(uint8Array: Uint8Array): Promise<string> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([uint8Array.buffer as ArrayBuffer], {
        type: 'application/octet-binary',
      });
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix to save space
        resolve(base64.split(',')[1]);
      };

      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.abortController = null;
    this.ffmpeg?.terminate();
  }
}
