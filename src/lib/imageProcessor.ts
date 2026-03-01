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

import { loadWasm, type WasmEngine } from "./wasmLoader";

export interface ProcessResult {
    blob: Blob;
    width: number;
    height: number;
    originalSize: number;
    processedSize: number;
    action: "upscale" | "downscale";
    format: string;
    engine: "wasm" | "canvas";
    processingTimeMs: number;
}

export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export type ProgressCallback = (progress: number, message: string) => void;

// Helper to yield to the main thread so the browser can paint progress updates
const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

// --- Helpers ---

/** Convert WASM Uint8Array (may be backed by SharedArrayBuffer) to plain ArrayBuffer-backed copy */
function toSafeBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
    const copy = new ArrayBuffer(data.byteLength);
    const view = new Uint8Array(copy);
    view.set(data);
    return view;
}

function mimeToShort(mime: string): string {
    switch (mime) {
        case "image/jpeg": return "jpeg";
        case "image/png": return "png";
        case "image/webp": return "webp";
        default: return "jpeg";
    }
}

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

async function wasmCompress(
    wasm: WasmEngine,
    inputBytes: Uint8Array,
    origW: number,
    origH: number,
    targetBytes: number,
    format: OutputFormat,
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
    const shortFmt = mimeToShort(format);
    const totalSteps = 15;
    const startTime = performance.now();

    // For PNG, quality is ignored — binary search on scale only
    if (format === "image/png") {
        const scales = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05];
        for (let i = 0; i < scales.length; i++) {
            onProgress?.(((i + 1) / scales.length) * 100, `Trying scale ${Math.round(scales[i] * 100)}%`);
            await yieldToMain();
            const w = Math.max(1, Math.round(origW * scales[i]));
            const h = Math.max(1, Math.round(origH * scales[i]));
            const result = wasm.resize_image(inputBytes, w, h, shortFmt, 100);
            if (result.length <= targetBytes) {
                return {
                    blob: new Blob([toSafeBytes(result)], { type: format }),
                    width: w, height: h,
                    originalSize: inputBytes.length, processedSize: result.length,
                    action: "downscale", format,
                    engine: "wasm",
                    processingTimeMs: performance.now() - startTime,
                };
            }
        }
        // Extreme fallback
        const tiny = wasm.resize_image(inputBytes, 16, 16, "jpeg", 10);
        return {
            blob: new Blob([toSafeBytes(tiny)], { type: "image/jpeg" }),
            width: 16, height: 16,
            originalSize: inputBytes.length, processedSize: tiny.length,
            action: "downscale", format: "image/jpeg",
            engine: "wasm",
            processingTimeMs: performance.now() - startTime,
        };
    }

    // JPEG/WebP: binary search on scale first, then quality
    const scales = [1, 0.85, 0.7, 0.55, 0.4, 0.25, 0.1];
    for (const scale of scales) {
        const w = Math.max(1, Math.round(origW * scale));
        const h = Math.max(1, Math.round(origH * scale));

        // Binary search on quality at this scale
        let lo = 1, hi = 100;
        let best: Uint8Array | null = null;

        for (let i = 0; i < totalSteps; i++) {
            const mid = Math.round((lo + hi) / 2);
            onProgress?.(
                ((i + 1) / totalSteps) * 100,
                `Scale ${Math.round(scale * 100)}% · Quality ${mid}%`
            );
            await yieldToMain();

            const result = wasm.encode_at_quality(inputBytes, w, h, shortFmt, mid);
            if (result.length <= targetBytes) {
                best = result;
                lo = mid + 1; // Try higher quality
            } else {
                hi = mid - 1;
            }
        }

        if (best) {
            return {
                blob: new Blob([toSafeBytes(best)], { type: format }),
                width: w, height: h,
                originalSize: inputBytes.length, processedSize: best.length,
                action: "downscale", format,
                engine: "wasm",
                processingTimeMs: performance.now() - startTime,
            };
        }
    }

    // Absolute fallback
    const tiny = wasm.resize_image(inputBytes, 16, 16, "jpeg", 1);
    return {
        blob: new Blob([toSafeBytes(tiny)], { type: "image/jpeg" }),
        width: 16, height: 16,
        originalSize: inputBytes.length, processedSize: tiny.length,
        action: "downscale", format: "image/jpeg",
        engine: "wasm",
        processingTimeMs: performance.now() - startTime,
    };
}

async function wasmUpscale(
    wasm: WasmEngine,
    inputBytes: Uint8Array,
    origW: number,
    origH: number,
    targetBytes: number,
    format: OutputFormat,
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
    const shortFmt = mimeToShort(format);
    const maxDim = 16384;
    const totalSteps = 15;
    const startTime = performance.now();

    // Binary search on scale factor
    let lo = 1.0;
    let hi = Math.min(maxDim / Math.max(origW, origH), 10);
    let bestResult: Uint8Array | null = null;
    let bestW = origW, bestH = origH;

    for (let i = 0; i < totalSteps; i++) {
        const mid = (lo + hi) / 2;
        const w = Math.min(maxDim, Math.max(1, Math.round(origW * mid)));
        const h = Math.min(maxDim, Math.max(1, Math.round(origH * mid)));

        onProgress?.(((i + 1) / totalSteps) * 100, `Scale ${Math.round(mid * 100)}%`);
        await yieldToMain();

        const result = wasm.resize_image(inputBytes, w, h, shortFmt, 100);
        if (result.length >= targetBytes) {
            bestResult = result;
            bestW = w;
            bestH = h;
            hi = mid;
        } else {
            lo = mid;
        }
    }

    if (bestResult) {
        // Fine-tune with quality reduction for JPEG/WebP
        if (bestResult.length > targetBytes * 1.2 && format !== "image/png") {
            let qLo = 10, qHi = 100;
            let refined = bestResult;
            for (let i = 0; i < 10; i++) {
                const qMid = Math.round((qLo + qHi) / 2);
                onProgress?.(90 + i, `Refining upscale quality ${qMid}%`);
                await yieldToMain();
                const result = wasm.encode_at_quality(inputBytes, bestW, bestH, shortFmt, qMid);
                if (result.length >= targetBytes) {
                    refined = result;
                    qHi = qMid;
                } else {
                    qLo = qMid;
                }
            }
            return {
                blob: new Blob([toSafeBytes(refined)], { type: format }),
                width: bestW, height: bestH,
                originalSize: inputBytes.length, processedSize: refined.length,
                action: "upscale", format,
                engine: "wasm",
                processingTimeMs: performance.now() - startTime,
            };
        }

        return {
            blob: new Blob([toSafeBytes(bestResult)], { type: format }),
            width: bestW, height: bestH,
            originalSize: inputBytes.length, processedSize: bestResult.length,
            action: "upscale", format,
            engine: "wasm",
            processingTimeMs: performance.now() - startTime,
        };
    }

    // Fallback: max dimensions
    const fw = Math.min(maxDim, Math.round(origW * hi));
    const fh = Math.min(maxDim, Math.round(origH * hi));
    const fb = wasm.resize_image(inputBytes, fw, fh, shortFmt, 100);
    return {
        blob: new Blob([toSafeBytes(fb)], { type: format }),
        width: fw, height: fh,
        originalSize: inputBytes.length, processedSize: fb.length,
        action: "upscale", format,
        engine: "wasm",
        processingTimeMs: performance.now() - startTime,
    };
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
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
    // Try WASM first
    const wasm = await loadWasm();

    if (wasm) {
        onProgress?.(5, "Loading image into WASM engine...");
        const inputBytes = await fileToUint8Array(file);
        const dims = wasm.get_dimensions(inputBytes);
        const origW = dims[0];
        const origH = dims[1];

        let result: ProcessResult;
        if (file.size > targetBytes) {
            result = await wasmCompress(wasm, inputBytes, origW, origH, targetBytes, outputFormat, onProgress);
        } else {
            result = await wasmUpscale(wasm, inputBytes, origW, origH, targetBytes, outputFormat, onProgress);
        }
        result.originalSize = file.size;
        return result;
    }

    // Canvas fallback
    onProgress?.(5, "Using Canvas engine...");
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);
        let result: ProcessResult;
        if (file.size > targetBytes) {
            result = await canvasCompress(img, targetBytes, outputFormat, onProgress);
        } else {
            result = await canvasUpscale(img, targetBytes, outputFormat, onProgress);
        }
        result.originalSize = file.size;
        return result;
    } finally {
        URL.revokeObjectURL(url);
    }
}
