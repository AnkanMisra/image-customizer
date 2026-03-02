import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Auto-generated WASM glue code:
    "public/wasm/**",
    // Pre-built ONNX Runtime bundles (minified, not our code):
    "public/ort.webgpu.min.js",
    "public/ort.all.min.js",
    "public/ai-worker.js",
    "public/*.mjs",
  ]),
]);

export default eslintConfig;
