"use client";

import React, { useState } from "react";
import { Zap, Brain, Cpu, Sparkles } from "lucide-react";
import { DropZone } from "@/components/DropZone";
import { Editor } from "@/components/Editor";
import { ResultBar } from "@/components/ResultBar";
import type { ProcessResult } from "@/lib/imageProcessor";

/**
 * DESIGN 2 — "LIQUID GLASS" (Apple Vision Pro inspired)
 * Deep immersive glassmorphism
 * Inter Tight typography, massive border radiuses (32px), 
 * floating glassmorphic container with deep blur, 
 * animated ambient background, soft inner drop shadows.
 */
export default function Design2() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ProcessResult | null>(null);

    const handleReset = () => {
        setFile(null);
        setResult(null);
    };

    // Minimalist Apple Pro Background
    const backgroundMarkup = (
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[#F5F5F7]">
            {/* Extremely subtle radial gradient for depth */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#FFFFFF_0%,_transparent_100%)] opacity-60" />
            <div className="absolute inset-0 opacity-[0.015] bg-[url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)]" />
        </div>
    );

    if (file) {
        return (
            <div className="min-h-screen flex flex-col font-[family-name:var(--font-intertight)] relative selection:bg-blue-500/20">
                {backgroundMarkup}
                <nav className="flex items-center justify-between px-8 sm:px-14 py-6 z-10">
                    <span className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">
                        ImageForge
                    </span>
                    <button
                        onClick={handleReset}
                        className="text-[14px] font-medium text-[#0071E3] hover:text-[#0058B0] transition-colors bg-white/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/60 shadow-sm"
                    >
                        ← Start over
                    </button>
                </nav>
                <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 py-10 z-10">
                    <div className="w-full max-w-7xl mx-auto space-y-6 bg-white border border-[#E5E5EA] shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-[40px] p-6 sm:p-10 relative overflow-hidden">
                        <div className="relative z-10">
                            <Editor file={file} onReset={handleReset} onResult={setResult} />
                            {result && <ResultBar result={result} originalFile={file} />}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 lg:p-12 font-[family-name:var(--font-intertight)] relative selection:bg-blue-500/20">
            {backgroundMarkup}

            {/* Main Apple Pro Container */}
            <div className="w-full max-w-[1300px] min-h-[750px] flex flex-col lg:grid lg:grid-cols-12 bg-white border border-[#E5E5EA] shadow-[0_24px_64px_rgba(0,0,0,0.06)] rounded-[40px] overflow-hidden relative z-10">

                {/* LEFT PANEL */}
                <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative z-10">
                    {/* Top Nav */}
                    <div className="flex items-center justify-between">
                        <span className="text-[20px] font-semibold tracking-tight text-[#1D1D1F]">
                            ImageForge
                        </span>
                        <span className="text-[11px] font-bold tracking-[0.08em] text-[#1D1D1F]/50 bg-black/5 px-2.5 py-1 rounded-full backdrop-blur-md uppercase">
                            Pro Suite
                        </span>
                    </div>

                    {/* Hero Content */}
                    <div className="space-y-6 mt-16 mb-12 lg:my-0 lg:flex-1 lg:flex lg:flex-col lg:justify-center animate-fade-up">
                        <h1 className="text-[clamp(3rem,5vw,4.5rem)] font-bold tracking-tight leading-[1.05] text-[#1D1D1F]">
                            Perfectly <br />
                            <span className="text-[#86868B]">
                                precise.
                            </span>
                        </h1>
                        <p className="text-[15px] sm:text-[17px] text-[#1D1D1F]/60 leading-[1.5] max-w-[340px] font-medium">
                            Resize any image to an exact file size.
                            Upscale with AI or compress natively—entirely on your device.
                        </p>

                        {/* Feature Pills */}
                        <div className="pt-6 flex flex-wrap gap-3">
                            {[
                                { label: "Lanczos3", Icon: Zap },
                                { label: "Neural Engine", Icon: Brain },
                                { label: "WebGPU", Icon: Cpu },
                                { label: "Local Space", Icon: Sparkles },
                            ].map((tag) => (
                                <span
                                    key={tag.label}
                                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]/80 bg-[#F5F5F7] hover:bg-[#EAEAEA] border border-[#E5E5EA] shadow-sm px-4 py-2 rounded-full transition-all duration-300 cursor-default"
                                >
                                    <tag.Icon className="w-4 h-4 text-[#1D1D1F]/60" strokeWidth={2.5} />
                                    {tag.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Footer Nav */}
                    <div className="flex items-center gap-6 text-[13px] font-semibold text-[#1D1D1F]/40 bg-[#F5F5F7] w-max px-5 py-2.5 rounded-2xl border border-[#E5E5EA]">
                        <span className="text-[#1D1D1F]/90">Upload</span>
                        <span className="w-1 h-1 rounded-full bg-[#1D1D1F]/20" />
                        <span>Resize</span>
                        <span className="w-1 h-1 rounded-full bg-[#1D1D1F]/20" />
                        <span>Download</span>
                    </div>
                </div>

                {/* RIGHT PANEL - DropZone */}
                <div className="lg:col-span-7 p-4 sm:p-6 lg:p-8 flex items-stretch relative z-10 bg-[#FAFAFA]">
                    <div className="flex-1 w-full relative group overflow-hidden animate-fade-up" style={{ animationDelay: "0.15s" }}>
                        <div className="absolute inset-4 lg:inset-6 flex flex-col">
                            <DropZone
                                onFileSelect={setFile}
                                variant="apple"
                                fillHeight
                            />
                        </div>
                    </div>
                </div>
            </div>

            <p className="fixed bottom-6 text-[13px] font-medium text-[#1D1D1F]/40 text-center w-full shadow-sm z-0">
                Built for privacy. Images never leave your device.
            </p>
        </div>
    );
}
