/* tslint:disable */
/* eslint-disable */

/**
 * Encode an image at a specific quality without resizing.
 * Useful for the binary search on quality to hit a target file size.
 */
export function encode_at_quality(input_bytes: Uint8Array, width: number, height: number, format: string, quality: number): Uint8Array;

/**
 * Get the dimensions (width, height) of an image from its bytes.
 * Returns [width, height] as a Vec<u32>.
 */
export function get_dimensions(input_bytes: Uint8Array): Uint32Array;

/**
 * Resize an image to the given dimensions and encode to the specified format.
 *
 * Arguments:
 * - `input_bytes`: raw bytes of the source image
 * - `target_width`: desired width in pixels
 * - `target_height`: desired height in pixels
 * - `format`: output format — "jpeg", "png", or "webp"
 * - `quality`: JPEG/WebP quality 1-100 (ignored for PNG)
 *
 * Returns encoded bytes of the resized image.
 */
export function resize_image(input_bytes: Uint8Array, target_width: number, target_height: number, format: string, quality: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly get_dimensions: (a: number, b: number, c: number) => void;
    readonly encode_at_quality: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly resize_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
