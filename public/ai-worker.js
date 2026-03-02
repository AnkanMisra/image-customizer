/**
 * ImageForge AI Super-Resolution Worker
 * 
 * Uses ort.all.min.js (universal build) for cross-browser compatibility.
 * Detects WebGPU availability BEFORE attempting it to avoid poisoning
 * the WASM backend's initWasm() state.
 * 
 * Backend priority:
 *   1. WebGPU (Chrome 113+, Edge 113+) — GPU-accelerated, fastest
 *   2. WebGL  (most browsers) — GPU via WebGL, decent speed
 *   3. WASM   (all browsers) — CPU fallback, slowest but universal
 */

// Universal ONNX Runtime build — properly initializes ALL backends
importScripts('/ort.all.min.js');

// Configure WASM paths to the public directory
ort.env.wasm.wasmPaths = '/';
ort.env.wasm.numThreads = 1;

let session = null;

/**
 * Extract a tile from the source image AND pad it to exactly TILE_SIZE×TILE_SIZE.
 * The model has FIXED input dimensions [1, 3, 64, 64], so every tile must be
 * exactly 64×64. Edge tiles that are smaller get zero-padded.
 */
function imageDataToTensor(imageData, startX, startY, tileW, tileH, TILE_SIZE) {
    const numPixels = TILE_SIZE * TILE_SIZE;
    const float32Data = new Float32Array(numPixels * 3); // Pre-zeroed (zero-padding)
    const inData = imageData.data;
    const inWidth = imageData.width;

    for (let y = 0; y < tileH; y++) {
        for (let x = 0; x < tileW; x++) {
            const inIdx = ((startY + y) * inWidth + (startX + x)) * 4;
            const outIdx = y * TILE_SIZE + x;
            float32Data[outIdx] = inData[inIdx] / 255.0;
            float32Data[numPixels + outIdx] = inData[inIdx + 1] / 255.0;
            float32Data[numPixels * 2 + outIdx] = inData[inIdx + 2] / 255.0;
        }
    }
    return new ort.Tensor('float32', float32Data, [1, 3, TILE_SIZE, TILE_SIZE]);
}

/**
 * Detect which execution providers are available in this browser.
 * Order: WebGPU > WebGL > WASM (try best first, fall through)
 */
function getAvailableProviders() {
    const providers = [];

    // WebGPU: Chrome 113+, Edge 113+ (not Firefox, not Safari as of 2025)
    if (typeof navigator !== 'undefined' && navigator.gpu) {
        providers.push('webgpu');
    }

    // WebGL: nearly all browsers support this
    try {
        const canvas = new OffscreenCanvas(1, 1);
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
            providers.push('webgl');
        }
    } catch {
        // OffscreenCanvas not available, skip WebGL
    }

    // WASM: universal fallback — always available
    providers.push('wasm');

    return providers;
}

self.addEventListener('message', async (e) => {
    const { id, action, imageData } = e.data;
    if (action !== 'upscale') return;

    try {
        const startTime = performance.now();

        // --- SESSION INITIALIZATION (try each backend in order) ---
        if (!session) {
            self.postMessage({ id, type: 'progress', progress: 5, message: 'Loading AI Model...' });

            const providers = getAvailableProviders();
            console.log('[ImageForge AI] Available providers:', providers);

            let backend = null;
            let lastError = null;

            for (const provider of providers) {
                try {
                    self.postMessage({
                        id, type: 'progress', progress: 8,
                        message: `Trying ${provider.toUpperCase()} backend...`
                    });

                    session = await ort.InferenceSession.create('/models/realesrgan-x4.onnx', {
                        executionProviders: [provider]
                    });
                    backend = provider;
                    break; // Success — stop trying
                } catch (err) {
                    console.warn(`[ImageForge AI] ${provider} failed:`, err.message);
                    lastError = err;
                    session = null; // Reset for next attempt
                }
            }

            if (!session) {
                throw new Error(
                    'AI Engine Initialization Failed. ' +
                    'Your browser lacks WebGPU and WASM backend failed: ' +
                    (lastError ? lastError.message : 'Unknown error')
                );
            }

            console.log('[ImageForge AI] Model loaded using backend:', backend);
            self.postMessage({ id, type: 'progress', progress: 15, message: `AI Model ready (${backend})` });
        }

        // --- TILED INFERENCE ---
        // CRITICAL: This model has FIXED input dimensions of [1, 3, 64, 64].
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
                const tileW = Math.min(TILE_SIZE, imageData.width - startX);
                const tileH = Math.min(TILE_SIZE, imageData.height - startY);

                tileCount++;
                self.postMessage({
                    id,
                    type: 'progress',
                    progress: 15 + (tileCount / totalTiles) * 80,
                    message: `AI Processing Tile ${tileCount}/${totalTiles}...`
                });

                const inputTensor = imageDataToTensor(imageData, startX, startY, tileW, tileH, TILE_SIZE);
                const feeds = {};
                feeds[session.inputNames[0]] = inputTensor;

                const results = await session.run(feeds);
                const outputTensor = results[session.outputNames[0]];

                // Output is always [1, 3, 256, 256].
                // Only copy the VALID pixels (tileW*4 × tileH*4), ignoring padding.
                const float32Out = outputTensor.data;
                const validOutW = tileW * SCALE;
                const validOutH = tileH * SCALE;
                const outStartX = startX * SCALE;
                const outStartY = startY * SCALE;

                for (let y = 0; y < validOutH; y++) {
                    for (let x = 0; x < validOutW; x++) {
                        const srcIdx = y * OUT_TILE + x;
                        const dstIdx = ((outStartY + y) * outWidth + (outStartX + x)) * 4;

                        finalData[dstIdx]     = Math.max(0, Math.min(255, float32Out[srcIdx] * 255));
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
