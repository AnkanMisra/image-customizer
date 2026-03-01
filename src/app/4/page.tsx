"use client";

import React, { useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Editor } from "@/components/Editor";
import { ResultBar } from "@/components/ResultBar";
import type { ProcessResult } from "@/lib/imageProcessor";

/**
 * DESIGN 4 — "Bento Grid"
 * Everything lives in a grid of cards — brand, features, drop zone, CTA
 * Modern dashboard/bento aesthetic
 */
export default function Design4() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ProcessResult | null>(null);

    const handleReset = () => {
        setFile(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col">
            {/* NAV */}
            <nav className="flex items-center justify-between px-6 sm:px-8 py-5">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                    /imageforge
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                    Design 4
                </span>
            </nav>

            {!file ? (
                <div className="px-6 sm:px-8 pb-8">
                    {/* BENTO GRID */}
                    <div className="grid grid-cols-4 lg:grid-cols-12 gap-2.5 auto-rows-min">
                        {/* Brand card — spans 8 cols */}
                        <div className="col-span-4 lg:col-span-8 bg-white/[0.03] border border-white/[0.06] rounded-[4px] p-6 sm:p-8 flex flex-col justify-end min-h-[200px]">
                            <h1 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-bold tracking-[-0.04em] leading-[0.9] text-white/90 mb-3">
                                ImageForge
                            </h1>
                            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/50 max-w-md">
                                Resize any image to an exact file size. Compress or upscale.
                            </p>
                        </div>

                        {/* Tech card — spans 4 cols */}
                        <div className="col-span-4 bg-white/[0.02] border border-white/[0.06] rounded-[4px] p-6 flex flex-col justify-between min-h-[200px]">
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                                Powered by
                            </p>
                            <div>
                                <p className="font-display text-[28px] font-bold text-white/70 leading-tight">
                                    Rust
                                </p>
                                <p className="font-display text-[28px] font-bold text-white/40 leading-tight">
                                    WASM
                                </p>
                            </div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/35">
                                Lanczos3 resampling
                            </p>
                        </div>

                        {/* Feature cards — 3 small cards */}
                        <div className="col-span-2 lg:col-span-3 bg-white/[0.025] border border-white/[0.06] rounded-[4px] p-4 flex flex-col justify-between min-h-[120px]">
                            <p className="text-[20px]">🔒</p>
                            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/45 leading-relaxed">
                                100% Client-side
                                <br />
                                Nothing uploaded
                            </p>
                        </div>
                        <div className="col-span-2 lg:col-span-3 bg-white/[0.025] border border-white/[0.06] rounded-[4px] p-4 flex flex-col justify-between min-h-[120px]">
                            <p className="text-[20px]">↕</p>
                            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/45 leading-relaxed">
                                Upscale or
                                <br />
                                Compress
                            </p>
                        </div>
                        <div className="col-span-2 lg:col-span-3 bg-white/[0.025] border border-white/[0.06] rounded-[4px] p-4 flex flex-col justify-between min-h-[120px]">
                            <p className="text-[20px]">◎</p>
                            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/45 leading-relaxed">
                                JPG · PNG
                                <br />
                                WebP
                            </p>
                        </div>

                        {/* CTA card — inverted */}
                        <div className="col-span-2 lg:col-span-3 bg-white text-black rounded-[4px] p-4 flex flex-col justify-between min-h-[120px]">
                            <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold">
                                Free forever.
                            </p>
                            <p className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-50">
                                No sign-up needed ↓
                            </p>
                        </div>

                        {/* DROP ZONE — full width */}
                        <div className="col-span-4 lg:col-span-12">
                            <DropZone onFileSelect={setFile} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 pb-10">
                    <div className="w-full max-w-7xl mx-auto space-y-3">
                        <Editor file={file} onReset={handleReset} onResult={setResult} />
                        {result && <ResultBar result={result} originalFile={file} />}
                    </div>
                </div>
            )}
        </div>
    );
}
