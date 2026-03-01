"use client";

import React from "react";
import { Download, Zap, Monitor } from "lucide-react";
import {
    formatFileSize,
    getFormatExtension,
    type ProcessResult,
} from "@/lib/imageProcessor";

interface ResultBarProps {
    result: ProcessResult;
    originalFile: File;
}

export function ResultBar({ result, originalFile }: ResultBarProps) {
    const percentChange =
        result.action === "downscale"
            ? `-${(((result.originalSize - result.processedSize) / result.originalSize) * 100).toFixed(1)}%`
            : `+${(((result.processedSize - result.originalSize) / result.originalSize) * 100).toFixed(1)}%`;

    const timeStr =
        result.processingTimeMs < 1000
            ? `${Math.round(result.processingTimeMs)}ms`
            : `${(result.processingTimeMs / 1000).toFixed(1)}s`;

    const handleDownloadAgain = () => {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        const baseName = originalFile.name.replace(/\.[^.]+$/, "");
        a.href = url;
        a.download = `${baseName}_resized.${getFormatExtension(result.format)}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex items-center justify-between rounded-[3px] border border-white/15 bg-white/[0.015] px-4 py-3 animate-in fade-in slide-in-from-bottom-1 duration-400">
            <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em]">
                <span className="text-white/70">{formatFileSize(result.originalSize)}</span>
                <span className="text-white/40">→</span>
                <span className="text-white/90">{formatFileSize(result.processedSize)}</span>
                <span className="text-white/60">{percentChange}</span>
                <span className="text-white/50">
                    {result.width}×{result.height}
                </span>
                <span className="text-white/50">
                    {result.format.split("/")[1].toUpperCase()}
                </span>
                <span className="text-white/60">{timeStr}</span>
                <span
                    className={`flex items-center gap-0.5 ${result.engine === "wasm"
                        ? "text-emerald-500/60"
                        : "text-yellow-500/60"
                        }`}
                >
                    {result.engine === "wasm" ? (
                        <Zap className="w-2.5 h-2.5" />
                    ) : (
                        <Monitor className="w-2.5 h-2.5" />
                    )}
                    {result.engine}
                </span>
            </div>

            <button
                onClick={handleDownloadAgain}
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/60 hover:text-white/90 transition-colors"
            >
                <Download className="w-2.5 h-2.5" />
                Again
            </button>
        </div>
    );
}
