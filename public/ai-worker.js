/**
 * ImageForge AI Super-Resolution Worker
 * 
 * This worker runs OUTSIDE Turbopack's bundling system using importScripts()
 * to avoid blob URL path resolution issues with onnxruntime-web's WASM init.
 */

// Load ONNX Runtime Web (WebGPU build) directly from public/
importScripts('/ort.webgpu.min.js');

// Configure WASM paths to point to the public directory (absolute URL)
ort.env.wasm.wasmPaths = '/';
ort.env.wasm.numThreads = 1;

let session = null;

/**
 * Extract a tile from the source image AND pad it to exactly TILE_SIZE×TILE_SIZE.
 * The model has FIXED input dimensions [1, 3, 64, 64], so every tile must be
 * exactly 64×64. Edge tiles that are smaller get zero-padded.
 */
function imageDataToTensor(imageData, startX, startY, tileW, tileH, TILE_SIZE) {
    const numPixels = TILE_SIZE * TILE_SIZE; // Always 64*64 = 4096
    const float32Data = new Float32Array(numPixels * 3); // Pre-zeroed (zero-padding)
    const inData = imageData.data;
    const inWidth = imageData.width;

    // Only copy the valid pixels; the rest stays zero (black padding)
    for (let y = 0; y < tileH; y++) {
        for (let x = 0; x < tileW; x++) {
            const inIdx = ((startY + y) * inWidth + (startX + x)) * 4;
            const outIdx = y * TILE_SIZE + x; // Use TILE_SIZE stride, not tileW
            float32Data[outIdx] = inData[inIdx] / 255.0;
            float32Data[numPixels + outIdx] = inData[inIdx + 1] / 255.0;
            float32Data[numPixels * 2 + outIdx] = inData[inIdx + 2] / 255.0;
        }
    }
    return new ort.Tensor('float32', float32Data, [1, 3, TILE_SIZE, TILE_SIZE]);
}

self.addEventListener('message', async (e) => {
    const { id, action, imageData } = e.data;
    if (action !== 'upscale') return;

    try {
        const startTime = performance.now();

        // --- SESSION INITIALIZATION ---
        if (!session) {
            self.postMessage({ id, type: 'progress', progress: 5, message: 'Loading AI Model (63MB)...' });

            let backend = 'unknown';
            try {
                session = await ort.InferenceSession.create('/models/realesrgan-x4.onnx', {
                    executionProviders: ['webgpu']
                });
                backend = 'webgpu';
            } catch (webgpuErr) {
                console.warn('[ImageForge AI] WebGPU unavailable:', webgpuErr.message);
                try {
                    session = await ort.InferenceSession.create('/models/realesrgan-x4.onnx', {
                        executionProviders: ['wasm']
                    });
                    backend = 'wasm-cpu';
                } catch (wasmErr) {
                    console.error('[ImageForge AI] WASM also failed:', wasmErr.message);
                    throw new Error(
                        'AI Engine cannot start. Neither WebGPU nor WebAssembly ' +
                        'backends are available in your browser. ' +
                        'Try Chrome 113+ or Edge 113+ for WebGPU support.'
                    );
                }
            }
            console.log('[ImageForge AI] Model loaded using backend:', backend);
            self.postMessage({ id, type: 'progress', progress: 15, message: `AI Model ready (${backend})` });
        }

        // --- TILED INFERENCE ---
        // CRITICAL: This model has FIXED input dimensions of [1, 3, 64, 64].
        // Every tile MUST be exactly 64×64. Edge tiles are zero-padded, then cropped.
        const TILE_SIZE = 64;
        const SCALE = 4;
        const OUT_TILE = TILE_SIZE * SCALE; // 256
        const outWidth = imageData.width * SCALE;
        const outHeight = imageData.height * SCALE;
        const finalData = new Uint8ClampedArray(outWidth * outHeight * 4);

        const tilesX = Math.ceil(imageData.width / TILE_SIZE);
        const tilesY = Math.ceil(imageData.height / TILE_SIZE);
        const totalTiles = tilesX * tilesY;
        let tileCount = 0;

        for (let ty = 0; ty < tilesY; ty++) {
            for (let tx = 0; tx < tilesX; tx++) {
                const startX = tx * TILE_SIZE;
                const startY = ty * TILE_SIZE;
                // Actual valid pixels in this tile (may be < TILE_SIZE at edges)
                const tileW = Math.min(TILE_SIZE, imageData.width - startX);
                const tileH = Math.min(TILE_SIZE, imageData.height - startY);

                tileCount++;
                self.postMessage({
                    id,
                    type: 'progress',
                    progress: 15 + (tileCount / totalTiles) * 80,
                    message: `AI Processing Tile ${tileCount}/${totalTiles}...`
                });

                // Create padded 64×64 tensor (edge tiles get zero-padded)
                const inputTensor = imageDataToTensor(imageData, startX, startY, tileW, tileH, TILE_SIZE);
                const feeds = {};
                feeds[session.inputNames[0]] = inputTensor;

                const results = await session.run(feeds);
                const outputTensor = results[session.outputNames[0]];

                // Output is always [1, 3, 256, 256] (full 64×4 = 256)
                // But we only copy the VALID pixels (tileW*4 × tileH*4), ignoring padding
                const float32Out = outputTensor.data;
                const validOutW = tileW * SCALE;
                const validOutH = tileH * SCALE;
                const outStartX = startX * SCALE;
                const outStartY = startY * SCALE;

                for (let y = 0; y < validOutH; y++) {
                    for (let x = 0; x < validOutW; x++) {
                        // Source index uses OUT_TILE stride (256), not validOutW
                        const srcIdx = y * OUT_TILE + x;
                        const dstIdx = ((outStartY + y) * outWidth + (outStartX + x)) * 4;

                        finalData[dstIdx] = Math.max(0, Math.min(255, float32Out[srcIdx] * 255));
                        finalData[dstIdx + 1] = Math.max(0, Math.min(255, float32Out[OUT_TILE * OUT_TILE + srcIdx] * 255));
                        finalData[dstIdx + 2] = Math.max(0, Math.min(255, float32Out[OUT_TILE * OUT_TILE * 2 + srcIdx] * 255));
                        finalData[dstIdx + 3] = 255;
                    }
                }

                inputTensor.dispose();
                outputTensor.dispose();
            }
        }

        // Send back the completed image
        const safeCopy = finalData.buffer.slice(0);
        const finalImage = new ImageData(new Uint8ClampedArray(safeCopy), outWidth, outHeight);

        self.postMessage({
            id,
            type: 'success',
            outputImageData: finalImage,
            width: outWidth,
            height: outHeight,
            processingTimeMs: performance.now() - startTime
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[ImageForge AI] Worker Error:', errorMessage);
        self.postMessage({ id, type: 'error', error: errorMessage });
    }
});
