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

## Deployment Configurations

### Netlify

Create `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

### Vercel

Create `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        }
      ]
    }
  ]
}
```

### Cloudflare Pages

Create `_headers` file in your public directory:

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

### Nginx

Add to your nginx configuration:

```nginx
location / {
    add_header Cross-Origin-Opener-Policy "same-origin";
    add_header Cross-Origin-Embedder-Policy "require-corp";
}
```

### Apache

Add to `.htaccess`:

```apache
<IfModule mod_headers.c>
    Header set Cross-Origin-Opener-Policy "same-origin"
    Header set Cross-Origin-Embedder-Policy "require-corp"
</IfModule>
```

## Testing Multi-Threading

Open browser console and run:

```javascript
console.log('SharedArrayBuffer supported:', typeof SharedArrayBuffer !== 'undefined');
console.log('Hardware cores:', navigator.hardwareConcurrency);
```

If SharedArrayBuffer is `undefined`, the headers are not configured correctly.

## Performance Impact

### With Multi-Threading (4 cores):
- 2-hour video: ~5-8 minutes
- 1-hour video: ~2-4 minutes
- 30-min video: ~1-2 minutes

### Without Multi-Threading (single core):
- 2-hour video: ~15-25 minutes
- 1-hour video: ~7-12 minutes
- 30-min video: ~3-6 minutes

**Multi-threading provides 2-3x speedup!**

## Fallback Behavior

If SharedArrayBuffer is not available:
- The app will show a warning
- FFmpeg will fall back to single-threaded mode
- Processing will be slower but still functional
- No errors, just reduced performance

## Development Quick Start

1. Create `vite.config.ts` with the headers above
2. Restart your dev server: `pnpm dev`
3. Open browser console and verify SharedArrayBuffer is available
4. Enjoy multi-threaded frame extraction!

## Browser Compatibility

Multi-threading works in:
- ✅ Chrome 92+ (with headers)
- ✅ Edge 92+ (with headers)
- ✅ Firefox 89+ (with headers)
- ✅ Safari 15.2+ (with headers)

All modern browsers support SharedArrayBuffer when proper headers are sent.
