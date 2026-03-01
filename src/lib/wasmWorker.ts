import { loadWasm } from "./wasmLoader";
import type { OutputFormat } from "./imageProcessorTypes.js";

export type WorkerRequest = {
    id: string;
    action: "downscale" | "upscale";
    inputBytes: Uint8Array;
    origW: number;
    origH: number;
    targetBytes: number;
    format: OutputFormat;
};

export type WorkerResponse =
    | { id: string; type: "progress"; progress: number; message: string }
    | { id: string; type: "success"; outputBytes: Uint8Array; width: number; height: number; processingTimeMs: number }
    | { id: string; type: "error"; error: string };

function mimeToShort(mime: string): string {
    switch (mime) {
        case "image/jpeg": return "jpeg";
        case "image/png": return "png";
        case "image/webp": return "webp";
        default: return "jpeg";
    }
}

addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
    const { id, action, inputBytes, origW, origH, targetBytes, format } = event.data;

    try {
        const wasm = await loadWasm();
        if (!wasm) {
            throw new Error("WASM engine failed to load in worker.");
        }

        const onProgress = (progress: number, message: string) => {
            postMessage({ id, type: "progress", progress, message });
        };

        const shortFmt = mimeToShort(format);
        const startTime = performance.now();
        let bestResult: Uint8Array | null = null;
        let finalW = origW;
        let finalH = origH;

        if (action === "downscale") {
            if (format === "image/png") {
                const scales = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05];
                for (let i = 0; i < scales.length; i++) {
                    onProgress(((i + 1) / scales.length) * 100, `Trying scale ${Math.round(scales[i] * 100)}%`);
                    const w = Math.max(1, Math.round(origW * scales[i]));
                    const h = Math.max(1, Math.round(origH * scales[i]));
                    const result = wasm.resize_image(inputBytes, w, h, shortFmt, 100, "lanczos3");
                    if (result.length <= targetBytes) {
                        bestResult = result;
                        finalW = w;
                        finalH = h;
                        break;
                    }
                }
                if (!bestResult) {
                    bestResult = wasm.resize_image(inputBytes, 16, 16, "jpeg", 10, "lanczos3");
                    finalW = 16;
                    finalH = 16;
                }
            } else {
                const scales = [1, 0.85, 0.7, 0.55, 0.4, 0.25, 0.1];
                outer: for (const scale of scales) {
                    const w = Math.max(1, Math.round(origW * scale));
                    const h = Math.max(1, Math.round(origH * scale));
                    let lo = 1, hi = 100;
                    const qualitySteps = 6;
                    for (let i = 0; i < qualitySteps; i++) {
                        const mid = Math.round((lo + hi) / 2);
                        onProgress(
                            ((i + 1) / qualitySteps) * 100,
                            `Scale ${Math.round(scale * 100)}% · Quality ${mid}%`
                        );
                        const result = wasm.encode_at_quality(inputBytes, w, h, shortFmt, mid, "lanczos3");
                        if (result.length <= targetBytes) {
                            bestResult = result;
                            finalW = w;
                            finalH = h;
                            lo = mid + 1;
                        } else {
                            hi = mid - 1;
                        }
                    }
                    if (bestResult) break outer;
                }
                if (!bestResult) {
                    bestResult = wasm.resize_image(inputBytes, 16, 16, "jpeg", 1, "lanczos3");
                    finalW = 16;
                    finalH = 16;
                }
            }
        } else if (action === "upscale") {
            const maxDim = 16384;
            const areaRatio = targetBytes / inputBytes.length;
            const predictedScale = Math.sqrt(areaRatio);
            let lo = predictedScale * 0.5;
            let hi = Math.max(predictedScale * 1.5, 10);
            hi = Math.min(maxDim / Math.max(origW, origH), hi);

            let bestW = origW, bestH = origH;
            const searchSteps = 4;
            for (let i = 0; i < searchSteps; i++) {
                const mid = (lo + hi) / 2;
                const w = Math.min(maxDim, Math.max(1, Math.round(origW * mid)));
                const h = Math.min(maxDim, Math.max(1, Math.round(origH * mid)));
                onProgress(((i + 1) / searchSteps) * 50, `Fast Mapping: Scale ${Math.round(mid * 100)}%`);
                const result = wasm.resize_image(inputBytes, w, h, shortFmt, 100, "triangle");
                if (result.length >= targetBytes) {
                    bestW = w;
                    bestH = h;
                    hi = mid;
                } else {
                    lo = mid;
                }
            }

            onProgress(70, "Rendering Enhanced Quality (Catmull-Rom)...");
            let finalResult = wasm.resize_image(inputBytes, bestW, bestH, shortFmt, 100, "catmullrom");

            if (finalResult.length > targetBytes * 1.2 && format !== "image/png") {
                let qLo = 10, qHi = 100;
                let refined = finalResult;
                for (let i = 0; i < 4; i++) {
                    const qMid = Math.round((qLo + qHi) / 2);
                    onProgress(80 + (i * 5), `Refining output quality ${qMid}%`);
                    const result = wasm.encode_at_quality(inputBytes, bestW, bestH, shortFmt, qMid, "catmullrom");
                    if (result.length >= targetBytes) {
                        refined = result;
                        qHi = qMid;
                    } else {
                        qLo = qMid;
                    }
                }
                finalResult = refined;
            }
            bestResult = finalResult;
            finalW = bestW;
            finalH = bestH;
        }

        if (!bestResult) {
            throw new Error("Processing failed to produce a result.");
        }

        const safeCopy = new ArrayBuffer(bestResult.byteLength);
        const safeView = new Uint8Array(safeCopy);
        safeView.set(bestResult);

        postMessage({
            id,
            type: "success",
            outputBytes: safeView,
            width: finalW,
            height: finalH,
            processingTimeMs: performance.now() - startTime
        }, { transfer: [safeCopy] });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error in worker";
        postMessage({ id, type: "error", error: errorMessage });
    }
});
