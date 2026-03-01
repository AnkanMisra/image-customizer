"use client";

import React, { useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Editor } from "@/components/Editor";
import { ResultBar } from "@/components/ResultBar";
import type { ProcessResult } from "@/lib/imageProcessor";

/**
 * DESIGN 3 — "Split Screen"
 * Left half: dark panel with branding + info
 * Right half: drop zone fills the entire right
 */
export default function Design3() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ProcessResult | null>(null);

    const handleReset = () => {
        setFile(null);
        setResult(null);
    };

    if (file) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col">
                <nav className="flex items-center justify-between px-8 sm:px-12 py-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                        /imageforge
                    </span>
                    <button
                        onClick={handleReset}
                        className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 hover:text-white/60 transition-colors"
                    >
                        ← Back
                    </button>
                </nav>
                <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 pb-10">
                    <div className="w-full max-w-7xl mx-auto space-y-3">
                        <Editor file={file} onReset={handleReset} onResult={setResult} />
                        {result && <ResultBar result={result} originalFile={file} />}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] grid grid-cols-1 lg:grid-cols-2">
            {/* LEFT PANEL */}
            <div className="flex flex-col justify-between p-8 sm:p-12 border-r border-white/[0.06]">
                <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                        /imageforge
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35 ml-4">
                        Design 3
                    </span>
                </div>

                <div className="space-y-8">
                    <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-[-0.04em] leading-[0.9] text-white/90">
                        Image
                        <br />
                        Forge
                    </h1>

                    <div className="space-y-3">
                        <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-white/60 leading-relaxed max-w-xs">
                            Resize any image to an exact file size. Compress or upscale — powered by Rust/WASM.
                        </p>
                    </div>

                    <div className="space-y-2">
                        {[
                            "⚡ Lanczos3 resampling",
                            "🔒 100% client-side",
                            "↕ Upscale & compress",
                            "◎ JPG · PNG · WebP",
                        ].map((feature) => (
                            <p
                                key={feature}
                                className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40"
                            >
                                {feature}
                            </p>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
                        /01 Upload
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
                        /02 Resize
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
                        /03 Download
                    </span>
                </div>
            </div>

            {/* RIGHT PANEL — Drop zone fills entire space */}
            <div className="flex items-center justify-center p-8 sm:p-12 bg-white/[0.015]">
                <div className="w-full max-w-md">
                    <DropZone onFileSelect={setFile} />
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/25 text-center mt-6">
                        images never leave your browser
                    </p>
                </div>
            </div>
        </div>
    );
}
