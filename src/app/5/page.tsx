"use client";

import React, { useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Editor } from "@/components/Editor";
import { ResultBar } from "@/components/ResultBar";
import type { ProcessResult } from "@/lib/imageProcessor";

/**
 * DESIGN 5 — "Terminal"
 * Hacker/terminal aesthetic — monospace everything
 * Looks like a CLI tool with a web skin
 */
export default function Design5() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ProcessResult | null>(null);

    const handleReset = () => {
        setFile(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col">
            {/* TERMINAL HEADER */}
            <div className="border-b border-white/[0.08] px-6 sm:px-10 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    <span className="font-mono text-[11px] text-white/40 ml-3">
                        imageforge — 1.0.0
                    </span>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
                    Design 5
                </span>
            </div>

            <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 py-8 max-w-6xl mx-auto w-full">
                {!file ? (
                    <div className="space-y-8">
                        {/* Terminal output */}
                        <div className="space-y-1">
                            <p className="font-mono text-[13px] text-white/50">
                                <span className="text-emerald-400/70">$</span> imageforge
                                --help
                            </p>
                            <div className="mt-3 space-y-0.5">
                                <p className="font-mono text-[13px] text-white/80 font-medium">
                                    ImageForge v1.0.0
                                </p>
                                <p className="font-mono text-[12px] text-white/45 mt-2">
                                    Resize any image to an exact file size.
                                </p>
                                <p className="font-mono text-[12px] text-white/45">
                                    Compress or upscale — powered by Rust/WASM.
                                </p>
                            </div>
                            <div className="mt-4 space-y-0.5">
                                <p className="font-mono text-[12px] text-white/35">
                                    <span className="text-white/50 inline-block w-24">
                                        engine
                                    </span>
                                    rust/wasm (lanczos3)
                                </p>
                                <p className="font-mono text-[12px] text-white/35">
                                    <span className="text-white/50 inline-block w-24">
                                        fallback
                                    </span>
                                    canvas api
                                </p>
                                <p className="font-mono text-[12px] text-white/35">
                                    <span className="text-white/50 inline-block w-24">
                                        formats
                                    </span>
                                    jpg, png, webp
                                </p>
                                <p className="font-mono text-[12px] text-white/35">
                                    <span className="text-white/50 inline-block w-24">
                                        privacy
                                    </span>
                                    100% client-side
                                </p>
                                <p className="font-mono text-[12px] text-white/35">
                                    <span className="text-white/50 inline-block w-24">
                                        cost
                                    </span>
                                    free, no sign-up
                                </p>
                            </div>
                        </div>

                        {/* Prompt + drop zone */}
                        <div className="space-y-3">
                            <p className="font-mono text-[13px] text-white/50">
                                <span className="text-emerald-400/70">$</span> imageforge
                                upload
                            </p>
                            <DropZone onFileSelect={setFile} />
                        </div>

                        {/* Blinking cursor */}
                        <p className="font-mono text-[13px] text-white/50">
                            <span className="text-emerald-400/70">$</span>
                            <span className="animate-pulse ml-1 text-white/60">▊</span>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="font-mono text-[13px] text-white/50 mb-4">
                            <span className="text-emerald-400/70">$</span> imageforge
                            process &quot;{file.name}&quot;
                        </p>
                        <Editor file={file} onReset={handleReset} onResult={setResult} />
                        {result && <ResultBar result={result} originalFile={file} />}
                    </div>
                )}
            </div>
        </div>
    );
}
