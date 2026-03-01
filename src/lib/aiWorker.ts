import { env, InferenceSession, Tensor } from 'onnxruntime-web/webgpu';

env.wasm.wasmPaths = '/';
env.wasm.numThreads = Math.max(1, navigator.hardwareConcurrency - 1 || 1);

export type AIWorkerRequest = {
    id: string;
    action: "upscale";
    imageData: ImageData;
};

let session: InferenceSession | null = null;

function imageDataToTensor(image: ImageData, startX: number, startY: number, width: number, height: number): Tensor {
    const numPixels = width * height;
    const float32Data = new Float32Array(numPixels * 3);
    const inData = image.data;
    const inWidth = image.width;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const inIdx = ((startY + y) * inWidth + (startX + x)) * 4;
            const outIdx = y * width + x;
            float32Data[outIdx] = inData[inIdx] / 255.0; // R
            float32Data[numPixels + outIdx] = inData[inIdx + 1] / 255.0; // G
            float32Data[numPixels * 2 + outIdx] = inData[inIdx + 2] / 255.0; // B
        }
    }
    return new Tensor('float32', float32Data, [1, 3, height, width]);
}

self.addEventListener('message', async (e: MessageEvent<AIWorkerRequest>) => {
    const { id, action, imageData } = e.data;
    if (action !== "upscale") return;

    try {
        const startTime = performance.now();

        if (!session) {
            self.postMessage({ id, type: 'progress', progress: 5, message: 'Loading AI Model into WebGPU (63MB)...' });
            try {
                // Try WebGPU first for 10x speed boost
                session = await InferenceSession.create('/models/realesrgan-x4.onnx', { executionProviders: ['webgpu'] });
            } catch (webgpuErr) {
                console.warn("[ImageForge] WebGPU not available, falling back to WebAssembly CPU:", webgpuErr);
                try {
                    // Critical: if webgpu fails, we must force the WASM execution provider explicitly
                    session = await InferenceSession.create('/models/realesrgan-x4.onnx', { executionProviders: ['wasm'] });
                } catch (wasmErr) {
                    throw new Error(`AI Engine Initialization Failed. Your browser lacks WebGPU and WASM backend failed: ${String(wasmErr)}`);
                }
            }
        }

        const outWidth = imageData.width * 4;
        const outHeight = imageData.height * 4;
        const finalData = new Uint8ClampedArray(outWidth * outHeight * 4);

        // --- TILING TO PREVENT VRAM OOM ---
        const TILE_SIZE = 128;
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

                self.postMessage({ id, type: 'progress', progress: 10 + (tileCount / totalTiles) * 85, message: `AI Processing Tile ${tileCount + 1}/${totalTiles}...` });

                const inputTensor = imageDataToTensor(imageData, startX, startY, tileW, tileH);
                const feeds: Record<string, Tensor> = { [session.inputNames[0]]: inputTensor };
                const results = await session.run(feeds);
                const outputTensor = results[session.outputNames[0]];

                const float32Data = outputTensor.data as Float32Array;
                const outPixels = tileW * 4 * tileH * 4;
                const outTileW = tileW * 4;
                const outTileH = tileH * 4;
                const outStartX = startX * 4;
                const outStartY = startY * 4;

                for (let y = 0; y < outTileH; y++) {
                    for (let x = 0; x < outTileW; x++) {
                        const inFloatIdx = y * outTileW + x;
                        const outGlobalIdx = ((outStartY + y) * outWidth + (outStartX + x)) * 4;

                        finalData[outGlobalIdx] = Math.max(0, Math.min(255, float32Data[inFloatIdx] * 255.0));
                        finalData[outGlobalIdx + 1] = Math.max(0, Math.min(255, float32Data[outPixels + inFloatIdx] * 255.0));
                        finalData[outGlobalIdx + 2] = Math.max(0, Math.min(255, float32Data[outPixels * 2 + inFloatIdx] * 255.0));
                        finalData[outGlobalIdx + 3] = 255;
                    }
                }

                // Allow GPU to breathe / Memory cleanup
                inputTensor.dispose();
                outputTensor.dispose();

                tileCount++;
            }
        }

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

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown AI error";
        console.error("AI Worker Error:", errorMessage);
        self.postMessage({ id, type: "error", error: errorMessage });
    }
});
