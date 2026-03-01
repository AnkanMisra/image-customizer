"use client";

import React, { useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Editor } from "@/components/Editor";
import { ResultBar } from "@/components/ResultBar";
import type { ProcessResult } from "@/lib/imageProcessor";

/**
 * DESIGN 1 — "Side-by-Side"
 * Hero text + taglines on LEFT, Drop zone on RIGHT
 * Feature cards below spanning full width
 */
export default function Design1() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ProcessResult | null>(null);

    const handleReset = () => {
        setFile(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen bg-[#050505] relative flex flex-col">
            {/* NAV */}
            <nav className="flex items-center justify-between px-8 sm:px-12 py-5">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                    /imageforge
                </span>
                <div className="flex items-center gap-6">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                        Design 1
                    </span>
                </div>
            </nav>

            {!file ? (
                <section className="px-8 sm:px-12 pt-6 pb-10">
                    {/* HERO — two columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* LEFT — branding */}
                        <div className="space-y-6">
                            <h1 className="font-display text-[clamp(3rem,8vw,5.5rem)] font-bold leading-[0.88] tracking-[-0.04em] text-white/[0.12] select-none">
                                Image
                                <br />
                                Forge
                            </h1>

                            <div className="flex flex-wrap gap-2.5">
                                <div className="bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 rounded-[3px]">
                                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/70 font-medium">
                                        Resize to exact file size.
                                    </p>
                                </div>
                                <div className="bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 rounded-[3px]">
                                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/50 font-medium">
                                        Rust/WASM · No upload.
                                    </p>
                                </div>
                            </div>

                            {/* Feature cards */}
                            <div className="grid grid-cols-2 gap-2.5 max-w-md">
                                <div className="bg-white/[0.025] border border-white/[0.06] p-3.5 rounded-[3px]">
                                    <p className="font-mono text-[16px] mb-1.5">⚡</p>
                                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/45 leading-relaxed">
                                        Lanczos3 Resampling
                                    </p>
                                </div>
                                <div className="bg-white/[0.025] border border-white/[0.06] p-3.5 rounded-[3px]">
                                    <p className="font-mono text-[16px] mb-1.5">🔒</p>
                                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/45 leading-relaxed">
                                        100% Client-side
                                    </p>
                                </div>
                                <div className="bg-white/[0.025] border border-white/[0.06] p-3.5 rounded-[3px]">
                                    <p className="font-mono text-[16px] mb-1.5">↕</p>
                                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/45 leading-relaxed">
                                        Upscale & Compress
                                    </p>
                                </div>
                                <div className="bg-white text-black p-3.5 rounded-[3px]">
                                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] font-bold leading-relaxed">
                                        Free. No sign-up.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT — Drop zone */}
                        <div className="lg:pt-4">
                            <DropZone onFileSelect={setFile} />
                        </div>
                    </div>
                </section>
            ) : (
                <section className="px-8 sm:px-12 py-10 flex-1 flex flex-col justify-center border-b border-transparent">
                    <div className="w-full max-w-7xl mx-auto space-y-3">
                        <Editor file={file} onReset={handleReset} onResult={setResult} />
                        {result && <ResultBar result={result} originalFile={file} />}
                    </div>
                </section>
            )}

            {/* FOOTER */}
            <footer className="px-8 sm:px-12 py-5 flex items-center justify-between border-t border-white/[0.06] mt-auto">
                <div className="flex items-center gap-8">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                        /01 Upload
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                        /02 Resize
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                        /03 Download
                    </span>
                </div>
                <span className="font-mono text-[10px] text-white/25 tracking-wider">
                    images never leave your browser
                </span>
            </footer>
        </div>
    );
}
