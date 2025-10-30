/**
 * Utility functions for processing video frames and integrating with LLMs
 */

import type { ExtractedFrame } from './extractFrames';

/**
 * Batch frames for processing in chunks
 */
export function batchFrames(frames: ExtractedFrame[], batchSize: number): ExtractedFrame[][] {
  const batches: ExtractedFrame[][] = [];

  for (let i = 0; i < frames.length; i += batchSize) {
    batches.push(frames.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Filter frames based on time range
 */
export function filterFramesByTimeRange(
  frames: ExtractedFrame[],
  startTime: number,
  endTime: number,
): ExtractedFrame[] {
  return frames.filter(frame => frame.timestamp >= startTime && frame.timestamp <= endTime);
}

/**
 * Sample frames at a different interval (e.g., every 5 seconds instead of 1)
 */
export function sampleFrames(frames: ExtractedFrame[], interval: number): ExtractedFrame[] {
  if (frames.length === 0) return [];

  const sampled: ExtractedFrame[] = [frames[0]]; // Always include first frame
  let lastTimestamp = frames[0].timestamp;

  for (const frame of frames) {
    if (frame.timestamp - lastTimestamp >= interval) {
      sampled.push(frame);
      lastTimestamp = frame.timestamp;
    }
  }

  return sampled;
}

/**
 * Calculate total size of frames in bytes
 */
export function calculateTotalSize(frames: ExtractedFrame[]): number {
  return frames.reduce(
    (sum, frame) => sum + frame.data.length * 0.75, // Base64 to bytes
    0,
  );
}

/**
 * Format size in human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Convert frame to data URL for direct use in img tags
 */
export function frameToDataURL(frame: ExtractedFrame): string {
  return `data:image/jpeg;base64,${frame.data}`;
}

/**
 * Download frames as JSON file
 */
export function downloadFramesAsJSON(frames: ExtractedFrame[], filename?: string): void {
  const dataStr = JSON.stringify(frames, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `video-frames-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Download individual frame as JPEG
 */
export function downloadFrame(frame: ExtractedFrame, filename?: string): void {
  const link = document.createElement('a');
  link.href = frameToDataURL(frame);
  link.download = filename || `frame-${frame.timestamp.toFixed(1)}s.jpg`;
  link.click();
}

/**
 * Create a video summary with frames at key moments
 * Useful for getting an overview before processing all frames
 */
export function createVideoSummary(
  frames: ExtractedFrame[],
  numFrames: number = 10,
): ExtractedFrame[] {
  if (frames.length <= numFrames) {
    return frames;
  }

  const interval = Math.floor(frames.length / numFrames);
  const summary: ExtractedFrame[] = [];

  for (let i = 0; i < numFrames; i++) {
    const index = Math.min(i * interval, frames.length - 1);
    summary.push(frames[index]);
  }

  return summary;
}

/**
 * Prepare frames for LLM API call (OpenAI format)
 */
export function prepareForOpenAI(frames: ExtractedFrame[], prompt: string) {
  return {
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          ...frames.map(frame => ({
            type: 'image_url' as const,
            image_url: {
              url: frameToDataURL(frame),
              detail: 'auto' as const,
            },
          })),
        ],
      },
    ],
    max_tokens: 4096,
  };
}

/**
 * Prepare frames for Claude API call (Anthropic format)
 */
export function prepareForClaude(frames: ExtractedFrame[], prompt: string) {
  return {
    model: 'claude-3-opus-20240229',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          ...frames.map(frame => ({
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/jpeg' as const,
              data: frame.data,
            },
          })),
        ],
      },
    ],
  };
}

/**
 * Split large frame sets into optimal batches for API calls
 * Considers token limits and rate limits
 */
export function createOptimalBatches(
  frames: ExtractedFrame[],
  maxImagesPerBatch: number = 10,
): ExtractedFrame[][] {
  return batchFrames(frames, maxImagesPerBatch);
}

/**
 * Estimate token usage for frames (approximate for OpenAI)
 * Each image uses roughly 85-170 tokens depending on detail level
 */
export function estimateTokens(
  frames: ExtractedFrame[],
  detail: 'low' | 'high' | 'auto' = 'auto',
): number {
  const baseTokens = 85; // Low detail
  const highDetailTokens = 170; // High detail

  const tokensPerImage =
    detail === 'high'
      ? highDetailTokens
      : detail === 'low'
      ? baseTokens
      : (baseTokens + highDetailTokens) / 2;

  return frames.length * tokensPerImage;
}

/**
 * Create a frame index for quick lookup
 */
export function createFrameIndex(frames: ExtractedFrame[]): Map<number, ExtractedFrame> {
  const index = new Map<number, ExtractedFrame>();

  for (const frame of frames) {
    const key = Math.floor(frame.timestamp);
    index.set(key, frame);
  }

  return index;
}

/**
 * Find frame closest to a specific timestamp
 */
export function findFrameAtTime(
  frames: ExtractedFrame[],
  timestamp: number,
): ExtractedFrame | null {
  if (frames.length === 0) return null;

  let closest = frames[0];
  let minDiff = Math.abs(frames[0].timestamp - timestamp);

  for (const frame of frames) {
    const diff = Math.abs(frame.timestamp - timestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = frame;
    }
  }

  return closest;
}

/**
 * Export frames as a ZIP file (requires JSZip library)
 * Install with: pnpm add jszip @types/jszip
 */
export async function exportFramesAsZip(
  frames: ExtractedFrame[],
  filename: string = 'frames.zip',
): Promise<void> {
  try {
    // Dynamic import of JSZip if available
    // @ts-ignore - JSZip is an optional dependency
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add each frame to the ZIP
    for (const frame of frames) {
      const imageData = atob(frame.data);
      const bytes = new Uint8Array(imageData.length);
      for (let i = 0; i < imageData.length; i++) {
        bytes[i] = imageData.charCodeAt(i);
      }

      const frameName = `frame_${frame.timestamp.toFixed(1)}s.jpg`;
      zip.file(frameName, bytes);
    }

    // Add metadata
    const metadata = {
      totalFrames: frames.length,
      timestamps: frames.map(f => f.timestamp),
      dimensions: frames[0] ? { width: frames[0].width, height: frames[0].height } : null,
      extractedAt: new Date().toISOString(),
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    // Generate and download ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('JSZip not available. Install it with: pnpm add jszip');
    throw new Error('JSZip library is required for ZIP export');
  }
}
