# Quick Start Guide

## Installation

```bash
cd /Users/mac/Desktop/work/video-search
pnpm install
```

## Run Development Server

```bash
pnpm dev
```

Then open your browser to the URL shown (usually `http://localhost:5173`)

## Basic Usage

### 1. Upload a Video
- Click the file input button
- Select any video file from your computer
- The system will automatically detect WebCodecs support

### 2. Watch Progress
- Real-time progress bar shows extraction status
- Frame count and timestamps update live
- Preview thumbnails appear during extraction

### 3. View Results
- See statistics (total frames, file size, processing time)
- Browse extracted frame previews
- Download frames as JSON for further processing

## Using the API in Your Code

### Simple Example

```typescript
import { VideoFrameExtractor } from './src/extractFrames';

// Create extractor
const extractor = new VideoFrameExtractor({
  quality: 0.7,
  maxWidth: 1280,
  maxHeight: 720,
  frameInterval: 1,
});

// Extract frames
const frames = await extractor.extractFrames(videoFile);

// Use frames
frames.forEach(frame => {
  console.log(`Frame at ${frame.timestamp}s`);
  const img = new Image();
  img.src = `data:image/jpeg;base64,${frame.data}`;
  document.body.appendChild(img);
});
```

### With Progress Callback

```typescript
const frames = await extractor.extractFrames(
  videoFile,
  (progress) => {
    console.log(`${progress.progress.toFixed(1)}% complete`);
  }
);
```

### Stream Processing (Memory Efficient)

```typescript
await extractor.extractFrames(
  videoFile,
  undefined,
  async (frame) => {
    // Process each frame immediately
    await sendToAPI(frame);
  }
);
```

## Send Frames to LLM

### OpenAI GPT-4 Vision

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: 'your-api-key',
  dangerouslyAllowBrowser: true // Only for demo
});

const response = await openai.chat.completions.create({
  model: 'gpt-4-vision-preview',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'What do you see in these video frames?' },
      ...frames.slice(0, 10).map(frame => ({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${frame.data}` }
      }))
    ]
  }],
  max_tokens: 1000,
});

console.log(response.choices[0].message.content);
```

### Claude (Anthropic)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: 'your-api-key',
});

const message = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze these video frames' },
      ...frames.slice(0, 5).map(frame => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: frame.data,
        }
      }))
    ]
  }],
});

console.log(message.content);
```

## Configuration Options

### For Long Videos (2+ hours)

```typescript
const extractor = new VideoFrameExtractor({
  quality: 0.6,        // Lower quality for smaller files
  maxWidth: 960,       // Lower resolution
  maxHeight: 540,
  frameInterval: 10,   // One frame every 10 seconds
});
```

### For High Quality Analysis

```typescript
const extractor = new VideoFrameExtractor({
  quality: 0.85,       // High quality
  maxWidth: 1920,      // Full HD
  maxHeight: 1080,
  frameInterval: 0.5,  // Two frames per second
});
```

### For Quick Preview

```typescript
const extractor = new VideoFrameExtractor({
  quality: 0.5,        // Low quality
  maxWidth: 640,       // Small resolution
  maxHeight: 360,
  frameInterval: 5,    // One frame every 5 seconds
});
```

## Utilities

### Create Video Summary (Key Frames)

```typescript
import { createVideoSummary } from './src/utils';

const frames = await extractor.extractFrames(videoFile);
const keyFrames = createVideoSummary(frames, 10); // Get 10 key frames
```

### Filter by Time Range

```typescript
import { filterFramesByTimeRange } from './src/utils';

const frames = await extractor.extractFrames(videoFile);
const segment = filterFramesByTimeRange(frames, 30, 60); // 30s to 60s
```

### Batch Processing

```typescript
import { batchFrames } from './src/utils';

const frames = await extractor.extractFrames(videoFile);
const batches = batchFrames(frames, 10); // Groups of 10 frames

for (const batch of batches) {
  await processWithLLM(batch);
  await new Promise(r => setTimeout(r, 1000)); // Rate limiting
}
```

## Advanced Examples

See `src/examples.ts` for 10 complete usage examples including:
- Basic extraction
- Streaming to LLM
- Time range analysis
- Batch processing
- LLM integrations
- Memory-efficient processing
- Adaptive quality

## Troubleshooting

### WebCodecs Not Supported
- **Chrome/Edge**: Should work (v94+)
- **Firefox**: Enable `dom.media.webcodecs.enabled` in about:config
- **Safari**: Not supported, uses fallback method

### Out of Memory
- Reduce `quality` (e.g., 0.5)
- Reduce `maxWidth` and `maxHeight`
- Increase `frameInterval`
- Use streaming approach (process frames one-by-one)

### Slow Extraction
- Ensure WebCodecs is enabled
- Try different video format (MP4/H.264 works best)
- Reduce resolution and quality

### Blurry Frames
- Increase `quality` (e.g., 0.9)
- Increase `maxWidth` and `maxHeight`
- Check source video quality

## Performance Tips

1. **Use WebCodecs**: 10-50x faster than fallback
2. **Adjust interval**: More frames = longer processing
3. **Lower resolution**: Faster + smaller output
4. **Stream processing**: Don't store all frames in memory
5. **Batch API calls**: Respect rate limits

## Browser Recommendations

**Best**: Chrome/Edge 94+ (full WebCodecs support)
**Good**: Firefox with flag enabled
**Fallback**: Safari (uses canvas method, slower)

## File Format Recommendations

**Best**: MP4 with H.264 codec
**Good**: WebM with VP9 codec
**OK**: MOV, other formats (may be slower)

**Avoid**: Exotic codecs, very high bitrate 4K videos

## Next Steps

1. Check `README.md` for detailed documentation
2. Review `IMPLEMENTATION.md` for technical details
3. Explore `src/examples.ts` for usage patterns
4. Start with demo: `pnpm dev`
