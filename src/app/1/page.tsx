"use client";

import React, { useState } from "react";
import { Zap, Brain, Cpu, Sparkles, ArrowRight } from "lucide-react";
import { DropZone } from "@/components/DropZone";
import { Editor } from "@/components/Editor";
import { ResultBar } from "@/components/ResultBar";
import type { ProcessResult } from "@/lib/imageProcessor";

/**
 * DESIGN 1 — "OBSIDIAN"
 * Luxury dark editorial × Apple product page
 * Playfair Display serif + DM Sans body
 * Warm ivory + gold accents on deep black
 *
 * UX: Full viewport, DropZone fills right column,
 * zero dead space, everything above the fold
 */
export default function Design1() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ProcessResult | null>(null);

    const handleReset = () => {
        setFile(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen lg:h-screen bg-[#0A0A0A] relative flex flex-col overflow-hidden lg:overflow-visible">
            {/* Radial glow — left side */}
            <div
                className="pointer-events-none absolute -top-10 -left-20 w-[600px] h-[450px] opacity-[0.06]"
                style={{
                    background: "radial-gradient(ellipse at center, #C9A96E 0%, transparent 70%)",
                }}
            />

            {!file ? (
                <>
                    {/* FULL VIEWPORT GRID — nav + content + footer all packed tight */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
                        {/* LEFT COLUMN — content */}
                        <div className="lg:col-span-5 flex flex-col px-6 sm:px-10 lg:px-14 py-5 lg:h-full">
                            {/* NAV */}
                            <nav className="flex items-center justify-between mb-auto">
                                <span className="font-dm text-[13px] font-medium tracking-[0.3em] uppercase text-[#E8DCC8]/60">
                                    ImageForge
                                </span>
                                <div className="flex items-center gap-4 sm:gap-6">
                                    {["Privacy-first", "No upload", "Free"].map((item, i) => (
                                        <React.Fragment key={item}>
                                            {i > 0 && <div className="w-[1px] h-3 bg-[#E8DCC8]/10" />}
                                            <span className={`font-dm text-[9px] sm:text-[10px] tracking-[0.15em] uppercase text-[#E8DCC8]/25 ${i === 1 ? "hidden sm:inline" : ""}`}>
                                                {item}
                                            </span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </nav>

                            {/* HERO — vertically centered */}
                            <div className="flex-1 flex flex-col justify-center space-y-6">
                                <div className="animate-fade-up">
                                    <h1 className="font-playfair text-[clamp(2.8rem,6.5vw,5.5rem)] font-medium leading-[0.9] tracking-[-0.02em] text-[#E8DCC8]/90">
                                        Craft your
                                        <br />
                                        <span className="italic text-[#C9A96E]/80">perfect</span>
                                        <br />
                                        image.
                                    </h1>
                                </div>

                                <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
                                    <p className="font-dm text-[14px] text-[#E8DCC8]/35 leading-[1.7] max-w-md">
                                        Resize any image to an exact file size.
                                        <br />
                                        Upscale with AI or compress with Rust/WASM
                                        <br />
                                        Entirely in your browser.
                                    </p>
                                </div>

                                {/* Feature pills */}
                                <div className="animate-fade-up flex flex-wrap items-center gap-2.5" style={{ animationDelay: "0.2s" }}>
                                    {[
                                        { label: "Lanczos3", Icon: Zap },
                                        { label: "AI 4× Upscale", Icon: Brain },
                                        { label: "WebGPU", Icon: Cpu },
                                        { label: "Free Forever", Icon: Sparkles },
                                    ].map((tag) => (
                                        <span
                                            key={tag.label}
                                            className="inline-flex items-center gap-1.5 font-dm text-[10px] tracking-[0.1em] uppercase text-[#C9A96E]/50 border border-[#C9A96E]/10 px-3 py-1.5 rounded-full hover:border-[#C9A96E]/25 hover:text-[#C9A96E]/70 transition-colors duration-300"
                                        >
                                            <tag.Icon className="w-3 h-3" strokeWidth={1.5} />
                                            {tag.label}
                                        </span>
                                    ))}
                                </div>

                                {/* Scroll hint on mobile */}
                                <div className="animate-fade-up lg:hidden flex items-center gap-2 mt-2" style={{ animationDelay: "0.3s" }}>
                                    <ArrowRight className="w-3 h-3 text-[#C9A96E]/30" />
                                    <span className="font-dm text-[10px] tracking-[0.15em] uppercase text-[#C9A96E]/30">
                                        Drop your image below
                                    </span>
                                </div>
                            </div>

                            {/* FOOTER BAR */}
                            <div className="flex items-center justify-between py-4 mt-8 lg:mt-0 border-t border-[#E8DCC8]/[0.06]">
                                <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
                                    {["01 Upload", "02 Resize", "03 Download"].map((step, i) => (
                                        <span
                                            key={step}
                                            className={`font-dm text-[9px] tracking-[0.2em] uppercase whitespace-nowrap ${i === 0 ? "text-[#C9A96E]/40" : "text-[#E8DCC8]/15"}`}
                                        >
                                            <span className="text-[#C9A96E]/60 mr-1">{step.split(' ')[0]}</span>
                                            {step.split(' ')[1]}
                                        </span>
                                    ))}
                                </div>
                                <span className="font-playfair text-[10px] italic text-[#C9A96E]/20 hidden sm:block">
                                    images never leave your browser
                                </span>
                            </div>
                        </div>

                        {/* RIGHT COLUMN — full-height DropZone */}
                        <div className="lg:col-span-7 flex flex-col lg:border-l border-t lg:border-t-0 border-[#E8DCC8]/[0.06] p-5 sm:p-6 pb-24 lg:pb-6 lg:h-full bg-[#0A0A0A]/50 lg:bg-transparent min-h-[450px] lg:min-h-0 animate-fade-up" style={{ animationDelay: "0.15s" }}>
                            <DropZone onFileSelect={setFile} fillHeight />

                            {/* Column footer */}
                            <div className="pt-4 flex items-center justify-between">
                                <span className="font-dm text-[9px] tracking-[0.2em] uppercase text-[#E8DCC8]/15">
                                    JPG · PNG · WebP
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-14 py-8">
                    <div className="w-full max-w-7xl mx-auto space-y-3">
                        <Editor file={file} onReset={handleReset} onResult={setResult} />
                        {result && <ResultBar result={result} originalFile={file} />}
                    </div>
                </div>
            )}
        </div>
    );
}
