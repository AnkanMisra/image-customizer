"use client";

import React, { useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Editor } from "@/components/Editor";
import { ResultBar } from "@/components/ResultBar";
import type { ProcessResult } from "@/lib/imageProcessor";

/**
 * DESIGN 2 — "Centered Stage"
 * Everything centered, large heading, subtitle, then drop zone
 * Clean vertical flow, cinematic feel
 */
export default function Design2() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ProcessResult | null>(null);

    const handleReset = () => {
        setFile(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col">
            {/* NAV */}
            <nav className="flex items-center justify-between px-8 sm:px-12 py-5">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                    /imageforge
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                    Design 2
                </span>
            </nav>

            <div className="flex-1 flex flex-col items-center justify-center px-6">
                {!file ? (
                    <div className="w-full max-w-2xl space-y-10 text-center">
                        {/* Brand */}
                        <div className="space-y-4">
                            <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold tracking-[-0.04em] leading-[0.9] text-white/90">
                                ImageForge
                            </h1>
                            <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-white/45">
                                Resize images to exact file size · Rust/WASM · 100% browser
                            </p>
                        </div>

                        {/* Feature pills */}
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            {["Lanczos3", "Client-side", "JPG · PNG · WebP", "Free"].map(
                                (tag) => (
                                    <span
                                        key={tag}
                                        className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 border border-white/[0.08] px-3 py-1.5 rounded-full"
                                    >
                                        {tag}
                                    </span>
                                )
                            )}
                        </div>

                        {/* Drop zone */}
                        <DropZone onFileSelect={setFile} />

                        {/* Privacy note */}
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
                            images never leave your browser
                        </p>
                    </div>
                ) : (
                    <div className="w-full max-w-5xl space-y-5">
                        <Editor file={file} onReset={handleReset} onResult={setResult} />
                        {result && <ResultBar result={result} originalFile={file} />}
                    </div>
                )}
            </div>
        </div>
    );
}
