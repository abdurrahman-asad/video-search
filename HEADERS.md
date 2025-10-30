# Cross-Origin Isolation for Multi-Threading

## Why This Matters

FFmpeg.wasm with multi-threading (`@ffmpeg/core-mt`) requires **SharedArrayBuffer** support, which browsers only enable in cross-origin isolated contexts for security reasons.

## Required Headers

Your web server must send these HTTP headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Vite Configuration

For local development, update your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```
