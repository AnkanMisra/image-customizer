export interface ProcessResult {
    blob: Blob;
    width: number;
    height: number;
    originalSize: number;
    processedSize: number;
    action: "upscale" | "downscale";
    format: string;
    engine: "wasm" | "canvas" | "ai";
    processingTimeMs: number;
}

export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export type ProgressCallback = (progress: number, message: string) => void;
