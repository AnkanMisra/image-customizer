import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    outputFileTracingExcludes: {
        '*': [
            // Prevent Vercel from trying to bundle 60MB+ models into the 250MB-limit serverless functions
            'public/models/**/*',
            'public/wasm/**/*',
            'public/*.wasm',
            'public/*.mjs'
        ],
    },
};

export default nextConfig;
