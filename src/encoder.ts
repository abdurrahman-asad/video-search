// No DOM types here, so add:
// export {};

self.onmessage = async (e: MessageEvent<{ bitmaps: ImageBitmap[]; startingIndex: number }>) => {
  const { bitmaps, startingIndex } = e.data;
  const blobs: Blob[] = [];

  if (bitmaps.length === 0) {
    postMessage(blobs);
    return;
  }

  // Initialize canvas once with dimensions from first bitmap
  const firstBitmap = bitmaps[0];
  const labelHeight = 20;
  const canvasWidth = firstBitmap.width;
  const canvasHeight = firstBitmap.height + labelHeight;

  let offscreenCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  let ctx = offscreenCanvas.getContext('2d')!;

  for (let i = 0; i < bitmaps.length; i++) {
    const bmp = bitmaps[i];
    ctx.drawImage(bmp, 0, 0);
    // Draw white background for label
    ctx.fillStyle = 'white';
    ctx.fillRect(0, bmp.height, canvasWidth, labelHeight);
    // Draw frame index
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + startingIndex}`, canvasWidth / 2, bmp.height + labelHeight / 2);

    blobs.push(
      await offscreenCanvas.convertToBlob({
        type: 'image/webp',
        quality: 0.8,
      }),
    );
    bmp.close(); // free GPU memory
  }

  postMessage(blobs);
};
