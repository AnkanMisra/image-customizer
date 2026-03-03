/**
 * Image Processor — WASM-first with Canvas API fallback
 *
 * When WASM is available:
 *   - Uses Rust `image` crate with Lanczos3 resampling
 *   - Binary search on quality + dimensions for target size
 *
 * When WASM is unavailable:
 *   - Falls back to Canvas API with bilinear interpolation
 *
 * Reports progress via callback during processing.
 */


import type { OutputFormat, ProcessResult, ProgressCallback } from "./imageProcessorTypes.js";

export type { OutputFormat, ProcessResult, ProgressCallback };



// Helper to yield to the main thread so the browser can paint progress updates
const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

// --- Helpers ---





export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getFormatExtension(format: string): string {
    switch (format) {
        case "image/jpeg": return "jpg";
        case "image/png": return "png";
        case "image/webp": return "webp";
        default: return "jpg";
    }
}

// ======================= WASM ENGINE =======================

async function fileToUint8Array(file: File): Promise<Uint8Array> {
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
}

let processorWorker: Worker | null = null;

function getWorker(): Worker {
    if (!processorWorker) {
        processorWorker = new Worker(new URL('./wasmWorker.ts', import.meta.url), { type: 'module' });
    }
    return processorWorker;
}

let aiWorker: Worker | null = null;

function getAIWorker(): Worker {
    if (!aiWorker) {
        // CRITICAL: Use a classic Worker loading from public/, NOT a Turbopack-bundled module.
        // Turbopack creates blob: URLs for module workers, which breaks onnxruntime-web's
        // internal WASM path resolution (it cannot find .wasm files from a blob: origin).
        // By using a static JS file with importScripts(), the worker resolves paths
        // relative to the page origin, which correctly serves the WASM files from public/.
        aiWorker = new Worker('/ai-worker.js');
    }
    return aiWorker;
}

function processViaWorker(
    action: "downscale" | "upscale",
    inputBytes: Uint8Array,
    origW: number,
    origH: number,
    targetBytes: number,
    format: OutputFormat,
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
        const worker = getWorker();
        const id = Math.random().toString(36).substring(7);

        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            if (data.id !== id) return;

            if (data.type === "progress") {
                onProgress?.(data.progress, data.message);
            } else if (data.type === "success") {
                worker.removeEventListener("message", handleMessage);
                resolve({
                    blob: new Blob([data.outputBytes], { type: format }),
                    width: data.width,
                    height: data.height,
                    originalSize: inputBytes.length,
                    processedSize: data.outputBytes.length,
                    action,
                    format,
                    engine: "wasm",
                    processingTimeMs: data.processingTimeMs
                });
            } else if (data.type === "error") {
                worker.removeEventListener("message", handleMessage);
                reject(new Error(data.error));
            }
        };

        worker.addEventListener("message", handleMessage);
        // Note: we just pass the inputBytes via typical clone strategy since the UI might still need memory, 
        // string transfers for images up to 20MB takes <1ms in modern browsers anyway.
        worker.postMessage({ id, action, inputBytes, origW, origH, targetBytes, format });
    });
}

// ======================= AI WEBGPU ENGINE =======================

export function processViaAIWorker(
    imageData: ImageData,
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
        const worker = getAIWorker();
        const id = Math.random().toString(36).substring(7);

        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            if (data.id !== id) return;

            if (data.type === "progress") {
                onProgress?.(data.progress, data.message);
            } else if (data.type === "success") {
                worker.removeEventListener("message", handleMessage);

                // Convert back the upscaled raw pixel ImageData to a Blob
                const canvas = document.createElement("canvas");
                canvas.width = data.width;
                canvas.height = data.height;
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.putImageData(data.outputImageData, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({
                            // Note: AI naturally outputs RGB, we bake it into JPG. 
                            blob,
                            width: data.width,
                            height: data.height,
                            originalSize: 0,
                            processedSize: blob.size,
                            action: "upscale",
                            format: "image/jpeg",
                            engine: "ai",
                            processingTimeMs: data.processingTimeMs
                        });
                    } else {
                        reject(new Error("AI Worker final blob creation failed"));
                    }
                }, "image/jpeg", 1.0);

            } else if (data.type === "error") {
                worker.removeEventListener("message", handleMessage);
                reject(new Error(data.error));
            }
        };

        worker.addEventListener("message", handleMessage);

        // Transfer the image array buffer physically to the worker to save memory
        const buffer = imageData.data.buffer;
        worker.postMessage({ id, action: "upscale", imageData }, [buffer]);
    });
}

/**
 * Initializes the AI Worker in the background. 
 * This lets the browser pre-download the 63MB ONNX model 
 * so the user doesn't wait when they do click "Resize & Download".
 */
export function initAIEngine(): Promise<void> {
    return new Promise((resolve) => {
        const worker = getAIWorker();
        const id = "init-" + Math.random().toString(36).substring(7);

        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            if (data.id !== id) return;
            if (data.type === "success" || data.type === "error") {
                worker.removeEventListener("message", handleMessage);
                resolve(); // resolve silently even on error so we don't crash app mount
            }
        };

        worker.addEventListener("message", handleMessage);
        // Pre-warm the model caching
        worker.postMessage({ id, action: "init" });
    });
}

// ======================= CANVAS FALLBACK =======================

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Blob creation failed"))),
            format,
            quality
        );
    });
}

function drawImage(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    return c;
}

async function canvasCompress(
    img: HTMLImageElement,
    targetBytes: number,
    format: OutputFormat,
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
    const origW = img.naturalWidth;
    const origH = img.naturalHeight;
    const startTime = performance.now();
    const scales = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05];

    for (const scale of scales) {
        const w = Math.max(1, Math.round(origW * scale));
        const h = Math.max(1, Math.round(origH * scale));
        const canvas = drawImage(img, w, h);

        if (format === "image/png") {
            onProgress?.(50, `Scale ${Math.round(scale * 100)}%`);
            await yieldToMain();
            const blob = await canvasToBlob(canvas, format, 1);
            if (blob.size <= targetBytes) {
                return {
                    blob, width: w, height: h,
                    originalSize: 0, processedSize: blob.size,
                    action: "downscale", format,
                    engine: "canvas",
                    processingTimeMs: performance.now() - startTime,
                };
            }
            continue;
        }

        let lo = 0.01, hi = 1.0;
        let best: Blob | null = null;
        for (let i = 0; i < 15; i++) {
            const mid = (lo + hi) / 2;
            onProgress?.(((i + 1) / 15) * 100, `Scale ${Math.round(scale * 100)}% · Quality ${Math.round(mid * 100)}%`);
            await yieldToMain();
            const blob = await canvasToBlob(canvas, format, mid);
            if (blob.size <= targetBytes) { best = blob; lo = mid; }
            else { hi = mid; }
        }

        if (best) {
            return {
                blob: best, width: w, height: h,
                originalSize: 0, processedSize: best.size,
                action: "downscale", format,
                engine: "canvas",
                processingTimeMs: performance.now() - startTime,
            };
        }
    }

    const tiny = drawImage(img, 16, 16);
    const blob = await canvasToBlob(tiny, "image/jpeg", 0.01);
    return {
        blob, width: 16, height: 16,
        originalSize: 0, processedSize: blob.size,
        action: "downscale", format: "image/jpeg",
        engine: "canvas",
        processingTimeMs: performance.now() - startTime,
    };
}

async function canvasUpscale(
    img: HTMLImageElement,
    targetBytes: number,
    format: OutputFormat,
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
    const origW = img.naturalWidth;
    const origH = img.naturalHeight;
    const maxDim = 16384;
    const startTime = performance.now();

    let lo = 1.0, hi = maxDim / Math.max(origW, origH);
    let bestBlob: Blob | null = null;
    let bestW = origW, bestH = origH;

    for (let i = 0; i < 15; i++) {
        const mid = (lo + hi) / 2;
        const w = Math.min(maxDim, Math.round(origW * mid));
        const h = Math.min(maxDim, Math.round(origH * mid));
        onProgress?.(((i + 1) / 15) * 100, `Scale ${Math.round(mid * 100)}%`);
        await yieldToMain();
        const canvas = drawImage(img, w, h);
        const blob = await canvasToBlob(canvas, format, 1.0);
        if (blob.size >= targetBytes) {
            bestBlob = blob; bestW = w; bestH = h; hi = mid;
        } else { lo = mid; }
    }

    if (bestBlob) {
        return {
            blob: bestBlob, width: bestW, height: bestH,
            originalSize: 0, processedSize: bestBlob.size,
            action: "upscale", format,
            engine: "canvas",
            processingTimeMs: performance.now() - startTime,
        };
    }

    const fw = Math.min(maxDim, Math.round(origW * hi));
    const fh = Math.min(maxDim, Math.round(origH * hi));
    const fc = drawImage(img, fw, fh);
    const fb = await canvasToBlob(fc, format, 1.0);
    return {
        blob: fb, width: fw, height: fh,
        originalSize: 0, processedSize: fb.size,
        action: "upscale", format,
        engine: "canvas",
        processingTimeMs: performance.now() - startTime,
    };
}

// ======================= MAIN ENTRY POINT =======================

export async function processImage(
    file: File,
    targetBytes: number,
    outputFormat: OutputFormat,
    onProgress?: ProgressCallback,
    upscaleEngine: "fast" | "ai" = "fast"
): Promise<ProcessResult> {
    onProgress?.(5, "Reading image dimensions...");
    const url = URL.createObjectURL(file);
    let img: HTMLImageElement;

    try {
        img = await loadImage(url);
    } catch {
        URL.revokeObjectURL(url);
        throw new Error("Failed to load image for processing");
    }

    const origW = img.naturalWidth;
    const origH = img.naturalHeight;
    const inputBytes = await fileToUint8Array(file);

    const action: "downscale" | "upscale" = file.size > targetBytes ? "downscale" : "upscale";
    if (action === "upscale" && upscaleEngine === "ai") {
        try {
            onProgress?.(5, "Preparing image for AI Deep Learning network...");
            const canvas = document.createElement("canvas");
            canvas.width = origW;
            canvas.height = origH;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get 2D context for AI prep");

            ctx.drawImage(img, 0, 0, origW, origH);
            const imageData = ctx.getImageData(0, 0, origW, origH);

            const result = await processViaAIWorker(imageData, onProgress);
            result.originalSize = file.size;
            result.format = outputFormat;
            URL.revokeObjectURL(url);
            return result;
        } catch (aiError) {
            console.warn("[ImageForge] AI Engine failed, falling back to Lightning mode:", aiError);
            if (aiWorker) {
                aiWorker.terminate();
                aiWorker = null;
            }
            // Graceful fallback: use the Canvas/Lightning engine instead of blocking the user
            onProgress?.(10, "AI unavailable — switching to Lightning mode...");
            const fallbackResult = await canvasUpscale(img, targetBytes, outputFormat, onProgress);
            fallbackResult.originalSize = file.size;
            fallbackResult.engine = "canvas";
            // Signal to the caller that we fell back (they can show a warning toast)
            (fallbackResult as ProcessResult & { aiFallback?: string }).aiFallback =
                aiError instanceof Error ? aiError.message : String(aiError);
            URL.revokeObjectURL(url);
            return fallbackResult;
        }
    }

    try {
        // Try to process via the WASM Web Worker
        onProgress?.(10, "Initializing high-speed WASM engine...");
        const result = await processViaWorker(action, inputBytes, origW, origH, targetBytes, outputFormat, onProgress);
        result.originalSize = file.size;
        URL.revokeObjectURL(url);
        return result;
    } catch (workerError) {
        console.warn("[ImageForge] Worker failed, killing worker and falling back to Canvas:", workerError);
        if (processorWorker) {
            processorWorker.terminate();
            processorWorker = null;
        }

        // Fallback gracefully to the slower Canvas engine 
        onProgress?.(10, "Using Canvas engine fallback...");

        let result: ProcessResult;
        if (action === "downscale") {
            result = await canvasCompress(img, targetBytes, outputFormat, onProgress);
        } else {
            result = await canvasUpscale(img, targetBytes, outputFormat, onProgress);
        }

        result.originalSize = file.size;
        URL.revokeObjectURL(url);
        return result;
    }
}
