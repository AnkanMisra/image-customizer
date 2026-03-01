"use client";

import React, { useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Editor } from "@/components/Editor";
import { ResultBar } from "@/components/ResultBar";
import type { ProcessResult } from "@/lib/imageProcessor";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const handleReset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      {/* NAV BAR */}
      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
          /imageforge
        </span>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-white/80 transition-colors"
          >
            Github
          </a>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            v1.0
          </span>
        </div>
      </nav>

      {/* HERO — shown only before file upload */}
      {!file && (
        <section className="relative z-10 px-6 sm:px-10 pt-8 pb-0">
          {/* Big brand name */}
          <h1 className="font-display text-[clamp(3.5rem,10vw,7rem)] font-bold leading-[0.9] tracking-[-0.04em] text-white/[0.12] select-none pointer-events-none">
            Image
            <br />
            Forge
          </h1>

          {/* Tagline cards — lawn.video style */}
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="bg-white/[0.04] border border-white/[0.06] px-5 py-3 rounded-[3px]">
              <p className="font-mono text-[12px] sm:text-[13px] uppercase tracking-[0.12em] text-white/80 font-medium leading-relaxed">
                Resize images to exact file size.
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] px-5 py-3 rounded-[3px]">
              <p className="font-mono text-[12px] sm:text-[13px] uppercase tracking-[0.12em] text-white/60 font-medium">
                Rust/WASM powered. No upload.
              </p>
            </div>
          </div>

          {/* Feature cards — lawn.video grid style */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/[0.025] border border-white/[0.05] p-4 rounded-[3px]">
              <p className="font-mono text-[20px] font-bold text-white/70">⚡</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mt-2 leading-relaxed">
                Lanczos3
                <br />
                Resampling
              </p>
            </div>
            <div className="bg-white/[0.025] border border-white/[0.05] p-4 rounded-[3px]">
              <p className="font-mono text-[20px] font-bold text-white/70">🔒</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mt-2 leading-relaxed">
                100%
                <br />
                Client-side
              </p>
            </div>
            <div className="bg-white/[0.025] border border-white/[0.05] p-4 rounded-[3px]">
              <p className="font-mono text-[20px] font-bold text-white/70">↕</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mt-2 leading-relaxed">
                Upscale &
                <br />
                Compress
              </p>
            </div>
            <div className="bg-white text-black p-4 rounded-[3px] flex flex-col justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold leading-relaxed">
                Free.
                <br />
                No sign-up.
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] mt-3 opacity-40">
                Drop below ↓
              </p>
            </div>
          </div>
        </section>
      )}

      {/* MAIN CONTENT */}
      <section className="relative z-10 px-6 sm:px-10 py-10 flex-1 flex flex-col justify-center">
        <div className="w-full max-w-7xl mx-auto">
          {!file ? (
            <DropZone onFileSelect={setFile} />
          ) : (
            <div className="space-y-3">
              <Editor file={file} onReset={handleReset} onResult={setResult} />
              {result && <ResultBar result={result} originalFile={file} />}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER — section markers lawn.video style */}
      <footer className="relative z-10 px-6 sm:px-10 py-6 flex items-center justify-between border-t border-white/[0.04]">
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
