/**
 * WASM Module Loader — Lazy singleton for the Rust image processor.
 *
 * Loads the WASM module once on first use, then caches it.
 * Returns null if WASM is unavailable (triggers Canvas fallback in imageProcessor).
 */

export type WasmEngine = {
    resize_image: (
        input: Uint8Array,
        width: number,
        height: number,
        format: string,
        quality: number,
        filter_name: string
    ) => Uint8Array;
    encode_at_quality: (
        input: Uint8Array,
        width: number,
        height: number,
        format: string,
        quality: number,
        filter_name: string
    ) => Uint8Array;
    get_dimensions: (input: Uint8Array) => Uint32Array;
};

let wasmEngine: WasmEngine | null = null;
let loadPromise: Promise<WasmEngine | null> | null = null;
let loadFailed = false;

export async function loadWasm(): Promise<WasmEngine | null> {
    if (loadFailed) return null;
    if (wasmEngine) return wasmEngine;

    if (!loadPromise) {
        loadPromise = initWasm();
    }

    return loadPromise;
}

async function initWasm(): Promise<WasmEngine | null> {
    try {
        const origin = typeof window !== "undefined" ? window.location.origin : self.location.origin;
        const jsUrl = new URL("/wasm/imageforge_wasm.js", origin).href;
        const wasmUrl = new URL("/wasm/imageforge_wasm_bg.wasm", origin).href;

        // Fetch the JS glue and WASM binary in parallel
        const [jsResponse, wasmResponse] = await Promise.all([
            fetch(jsUrl),
            fetch(wasmUrl),
        ]);

        if (!jsResponse.ok || !wasmResponse.ok) {
            throw new Error(`Failed to fetch WASM files. JS: ${jsResponse.status}, WASM: ${wasmResponse.status}`);
        }

        // Create a blob URL for the JS glue module so we can import it
        const jsText = await jsResponse.text();
        const jsBlob = new Blob([jsText], { type: "application/javascript" });
        const jsBlobUrl = URL.createObjectURL(jsBlob);

        // Dynamic import of the glue code from blob URL
        const wasm = await import(/* webpackIgnore: true */ jsBlobUrl);
        URL.revokeObjectURL(jsBlobUrl);

        // Initialize with the fetched WASM binary
        const wasmBytes = await wasmResponse.arrayBuffer();
        await wasm.default(wasmBytes);

        wasmEngine = wasm as WasmEngine;
        return wasmEngine;
    } catch (err) {
        console.warn("[ImageForge] WASM failed to load, falling back to Canvas:", err);
        loadFailed = true;
        return null;
    }
}

export function isWasmLoaded(): boolean {
    return wasmEngine !== null;
}

export function isWasmFailed(): boolean {
    return loadFailed;
}
