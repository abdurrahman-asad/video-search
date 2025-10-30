# Video Search

## Main Idea
A tool for retrospective search inside the videos using natural language. It'll have two main parts: frame extraction and processing the extracted frames with an LLM/SLM.

## Features

Frame extraction is in place and offers two extraction approaches, each optimized for different use cases:

### FFmpeg.wasm Approach (Recommended)

**Advantages:**
- ✅ **Universal Codec Support**: Handles all video formats (MP4, WebM, MOV, AVI, MKV, H.264, H.265, VP9, AV1, ProRes, etc.)
- ✅ **Multi-Threading Support**: Utilizes all CPU cores with `@ffmpeg/core-mt` for 2-3x faster processing
- ✅ **Professional-Grade Processing**: Uses FFmpeg's battle-tested video processing pipeline
- ✅ **Advanced Filtering**: Built-in fps filtering and precise frame extraction at specified intervals

**Drawbacks:**
- ⚠️ **Initial Download**: Requires downloading ~31MB FFmpeg core on first use (cached afterwards)
- ⚠️ **COOP/COEP Headers Required**: Multi-threading needs specific HTTP headers configured
- ⚠️ **Not Suitable for Very Large Files**: Entire video is copied to virtual filesystem in memory (limits ~4-8GB videos depending on available RAM)


### Native HTML5 Approach (Fallback)

**Advantages:**
- ✅ **Zero Dependencies**: No external libraries, uses native browser APIs
- ✅ **Instant Startup**: No initialization delay, works immediately
- ✅ **Lower Memory Baseline**: Starts with minimal memory footprint (~20-50MB)
- ✅ **No Special Headers**: Works without COOP/COEP configuration
- ✅ **Real-Time Preview**: Can display video frames during extraction
- ✅ **Simpler Deployment**: No additional build configuration needed

**Drawbacks:**
- ⚠️ **Limited Codec Support**: Only works with browser-supported codecs (H.264, VP8, VP9)
- ⚠️ **Format Restrictions**: Cannot handle AVI, MKV, or less common formats

### Common Features (Both Approaches)

- ✅ **Configurable**: Adjustable quality, resolution, and frame interval
- ✅ **Progress Tracking**: Real-time progress callbacks with frame count and timestamps
- ✅ **Frame-by-Frame Callbacks**: Process frames as they're extracted
- ✅ **Memory Cleanup**: Automatic cleanup to prevent memory leaks
- ✅ **LLM-Optimized**: Base64-encoded JPEG or blob output, ready for LLM APIs

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server (with proper headers for multi-threading)
pnpm dev
```

**Important**: Multi-threading requires specific HTTP headers. See [HEADERS.md](HEADERS.md) for setup instructions.

## How It Works

### FFmpeg.wasm Multi-Threading Approach

The system uses **FFmpeg.wasm** with **multi-threading** for maximum performance:

1. **Universal Codec Support**: FFmpeg handles all video formats (H.264, H.265, VP9, AV1, etc.)
2. **Multi-Core Processing**: Utilizes `@ffmpeg/core-mt` to leverage all CPU cores
3. **Thread Detection**: Automatically detects available cores via `navigator.hardwareConcurrency`
8. **Memory Management**: Cleans up processed frames immediately to free memory


### Native HTML5 Approach

The system uses **native browser APIs** for codec-supported videos:

1. **HTML5 Video Element**: Uses standard `<video>` element for video playback
2. **Canvas Rendering**: Draws video frames onto HTML5 Canvas at specified timestamps
4. **Web Worker Encoding**: Offloads JPEG encoding to background worker for non-blocking operation
6. **Batch Processing**: Encodes frames in batches to balance memory and performance
7. **Blob URLs**: Creates efficient blob URLs for frame data
8. **Progressive Cleanup**: Releases memory for processed frames continuously

## Configuration Options

```typescript
interface FrameExtractionOptions {
  quality?: number;        // JPEG quality (2-31, lower is better). Default: 2
  maxWidth?: number;       // Max width. Default: 1280
  maxHeight?: number;      // Max height. Default: 720
  frameInterval?: number;  // Extract every N seconds. Default: 1
}
```

## Usage

### Basic Usage

```typescript
import { VideoFrameExtractor } from './extractFrames';

const extractor = new VideoFrameExtractor({
  quality: 2,        // High quality (2-31, lower is better)
  maxWidth: 1280,
  maxHeight: 720,
  frameInterval: 1,  // One frame per second
});

const frames = await extractor.extractFrames(
  videoFile,
  (progress) => {
    console.log(`Progress: ${progress.progress}%`);
  },
  (frame) => {
    console.log(`Extracted frame at ${frame.timestamp}s`);
  }
);
```

### With Progress Tracking

```typescript
const onProgress = (progress) => {
  console.log(`Frames: ${progress.framesExtracted}`);
  console.log(`Time: ${progress.currentTime}/${progress.totalDuration}s`);
  console.log(`Progress: ${progress.progress}%`);
};

const frames = await extractor.extractFrames(videoFile, onProgress);
```

### Frame-by-Frame Processing

```typescript
const onFrame = (frame) => {
  // Send frame to LLM for processing
  const imageData = `data:image/jpeg;base64,${frame.data}`;
  // ... send to your LLM API
};

await extractor.extractFrames(videoFile, null, onFrame);
```

## Extracted Frame Format

```typescript
interface ExtractedFrame {
  data: string;      // Base64-encoded JPEG
  timestamp: number; // Timestamp in seconds
}
```

To use the frame data:
```typescript
const imageUrl = `data:image/jpeg;base64,${frame.data}`;
```
