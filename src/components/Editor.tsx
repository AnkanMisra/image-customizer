"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Download, X, Loader2, Zap, Monitor, Sparkles, Brain } from "lucide-react";
import {
    processImage,
    formatFileSize,
    getFormatExtension,
    initAIEngine,
    type OutputFormat,
    type ProcessResult,
} from "@/lib/imageProcessor";
import { loadWasm, isWasmLoaded } from "@/lib/wasmLoader";
import { saveRecord } from "@/lib/storage";
import { toast } from "sonner";

interface EditorProps {
    file: File;
    onReset: () => void;
    onResult: (result: ProcessResult) => void;
}

export function Editor({ file, onReset, onResult }: EditorProps) {
    const [previewUrl, setPreviewUrl] = useState("");
    const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
    const [targetValue, setTargetValue] = useState("");
    const [unit, setUnit] = useState<"KB" | "MB">("MB");
    const [format, setFormat] = useState<OutputFormat>("image/jpeg");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMsg, setProgressMsg] = useState("");
    const [wasmReady, setWasmReady] = useState(false);
    const [upscaleEngine, setUpscaleEngine] = useState<"fast" | "ai">("fast");

    // Comparison Modal State
    const [showComparison, setShowComparison] = useState(false);
    const [processedResult, setProcessedResult] = useState<{ url: string; result: ProcessResult } | null>(null);

    useEffect(() => {
        loadWasm().then((w) => setWasmReady(!!w));
        initAIEngine().catch(() => { }); // pre-warm AI explicitly in the background

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        const img = new Image();
        img.onload = () =>
            setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = url;

        if (file.type === "image/png") setFormat("image/png");
        else if (file.type === "image/webp") setFormat("image/webp");
        else setFormat("image/jpeg");

        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB >= 1) {
            setTargetValue(
                Math.max(0.1, parseFloat((sizeMB * 0.5).toFixed(1))).toString()
            );
            setUnit("MB");
        } else {
            setTargetValue(Math.round((file.size / 1024) * 0.5).toString());
            setUnit("KB");
        }

        if (processedResult) {
            URL.revokeObjectURL(processedResult.url);
            setProcessedResult(null);
            setShowComparison(false);
        }

        return () => URL.revokeObjectURL(url);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    const targetBytes =
        unit === "MB"
            ? parseFloat(targetValue || "0") * 1024 * 1024
            : parseFloat(targetValue || "0") * 1024;

    const isUpscale = file.size < targetBytes;
    const isDownscale = file.size > targetBytes;

    const handleProcess = async () => {
        if (!targetValue || targetBytes <= 0) {
            toast.error("Enter a valid target size");
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setProgressMsg("Starting...");

        try {
            const result = await processImage(file, targetBytes, format, (p, msg) => {
                setProgress(p);
                setProgressMsg(msg);
            }, upscaleEngine);

            const url = URL.createObjectURL(result.blob);

            // If AI failed and we fell back to Lightning, warn the user
            const fallbackReason = (result as ProcessResult & { aiFallback?: string }).aiFallback;
            if (fallbackReason) {
                toast.warning("AI Enhance unavailable in this browser. Used Lightning mode instead.", {
                    description: "For AI quality, try Chrome or Edge.",
                    duration: 6000,
                });
            }

            // Show the comparison modal instead of downloading immediately
            setProcessedResult({ url, result });
            setShowComparison(true);

        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Processing failed");
        } finally {
            setIsProcessing(false);
            setProgress(0);
            setProgressMsg("");
        }
    };

    const handleConfirmDownload = () => {
        if (!processedResult) return;

        const { url, result } = processedResult;
        const a = document.createElement("a");
        const baseName = file.name.replace(/\.[^.]+$/, "");
        a.href = url;
        a.download = `${baseName}_resized.${getFormatExtension(result.format)}`;
        a.click();

        saveRecord({
            originalName: file.name,
            originalSize: file.size,
            processedSize: result.processedSize,
            targetSize: targetBytes,
            format: result.format,
            action: result.action,
        });

        onResult(result);

        const timeStr =
            result.processingTimeMs < 1000
                ? `${Math.round(result.processingTimeMs)}ms`
                : `${(result.processingTimeMs / 1000).toFixed(1)}s`;

        toast.success(`Downloaded successfully in ${timeStr}`);
        setShowComparison(false);
    };

    const handleCancelDownload = () => {
        // Clean up the processed blob URL and reset state so the original preview reappears
        if (processedResult) {
            URL.revokeObjectURL(processedResult.url);
            setProcessedResult(null);
        }
        setShowComparison(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-px rounded-[3px] border border-white/15 overflow-hidden animate-in fade-in duration-400">
            {/* Preview — 3 cols */}
            <div className="relative lg:col-span-3 bg-[#060606] select-none">
                <div className="relative aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {previewUrl && !processedResult && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={previewUrl}
                            alt="Preview Original"
                            className="max-w-full max-h-full object-contain"
                        />
                    )}
                </div>

                {/* Metadata strip */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/15 bg-[#050505]">
                    <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em]">
                        <span className="text-white/70">{formatFileSize(file.size)}</span>
                        <span className="text-white/50">
                            {dimensions.w}×{dimensions.h}
                        </span>
                        <span
                            className={`flex items-center gap-1 ${wasmReady || isWasmLoaded()
                                ? "text-emerald-500/70"
                                : "text-yellow-500/70"
                                }`}
                        >
                            {wasmReady || isWasmLoaded() ? (
                                <>
                                    <Zap className="w-2.5 h-2.5" />
                                    wasm
                                </>
                            ) : (
                                <>
                                    <Monitor className="w-2.5 h-2.5" />
                                    canvas
                                </>
                            )}
                        </span>
                    </div>
                    <button
                        onClick={onReset}
                        className="text-white/50 hover:text-white/90 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Controls — 2 cols */}
            <div className="lg:col-span-2 bg-[#080808] p-5 flex flex-col justify-between space-y-5">
                {/* File name */}
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 truncate">
                    {file.name}
                </p>

                <div className="space-y-5">
                    {/* Target size */}
                    <div className="space-y-2">
                        <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">
                            Target size
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="target-size-input"
                                type="number"
                                min={0}
                                step="any"
                                value={targetValue}
                                onChange={(e) => setTargetValue(e.target.value)}
                                placeholder="0"
                                className="flex-1 bg-white/[0.03] border-white/15 text-white text-lg font-mono h-10 rounded-[3px] placeholder:text-white/10 focus:border-white/15 focus:ring-0"
                            />
                            <Select
                                value={unit}
                                onValueChange={(v) => setUnit(v as "KB" | "MB")}
                            >
                                <SelectTrigger className="w-[72px] bg-white/[0.03] border-white/15 text-white/50 h-10 font-mono text-[11px] rounded-[3px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="KB">KB</SelectItem>
                                    <SelectItem value="MB">MB</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Format */}
                    <div className="space-y-2">
                        <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">
                            Format
                        </Label>
                        <Select
                            value={format}
                            onValueChange={(v) => setFormat(v as OutputFormat)}
                        >
                            <SelectTrigger className="bg-white/[0.03] border-white/15 text-white/50 h-10 font-mono text-[11px] rounded-[3px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="image/jpeg">JPG</SelectItem>
                                <SelectItem value="image/png">PNG</SelectItem>
                                <SelectItem value="image/webp">WebP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Upscale Engine Selection */}
                    {isUpscale && (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                            <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400/90 font-bold flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" /> Upscale Engine
                            </Label>
                            <div className="flex bg-white/[0.03] p-1 rounded-[3px] border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setUpscaleEngine("fast")}
                                    className={`flex-1 py-1.5 text-[10px] font-mono uppercase tracking-[0.1em] rounded-[2px] transition-colors ${upscaleEngine === 'fast' ? 'bg-white/10 text-white font-bold' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <span className="flex items-center justify-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Lightning</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUpscaleEngine("ai")}
                                    className={`flex-1 py-1.5 text-[10px] font-mono uppercase tracking-[0.1em] rounded-[2px] transition-colors ${upscaleEngine === 'ai' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <span className="flex items-center justify-center gap-1.5"><Brain className="w-3.5 h-3.5" /> AI Enhance</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Direction hint */}
                    {targetValue && targetBytes > 0 && (
                        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/35">
                            {isUpscale
                                ? `↑ upscale to ${targetValue} ${unit}`
                                : isDownscale
                                    ? `↓ compress to ${targetValue} ${unit}`
                                    : "= already at target"}
                        </p>
                    )}

                    {/* Progress */}
                    {isProcessing && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                            <Progress value={progress} className="h-[3px] rounded-none" />
                            <p className="font-mono text-[10px] text-white/35 truncate uppercase tracking-wider">
                                {progressMsg}
                            </p>
                        </div>
                    )}
                </div>

                {/* Action button — inverted white like lawn.video CTA */}
                <Button
                    id="resize-download-btn"
                    onClick={handleProcess}
                    disabled={isProcessing || !targetValue || targetBytes <= 0}
                    className="w-full h-11 font-mono text-[11px] uppercase tracking-[0.15em] font-bold bg-white text-black hover:bg-white/90 border-0 rounded-[3px] transition-all duration-200 active:scale-[0.98] disabled:opacity-30"
                >
                    {isProcessing ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {Math.round(progress)}%
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Download className="w-3 h-3" />
                            Resize & Download
                        </span>
                    )}
                </Button>
            </div>

            {/* COMPARISON MODAL */}
            {
                showComparison && processedResult && (
                    <ComparisonModal
                        originalUrl={previewUrl}
                        enhancedUrl={processedResult.url}
                        originalSize={file.size}
                        enhancedSize={processedResult.result.processedSize}
                        onConfirm={handleConfirmDownload}
                        onCancel={handleCancelDownload}
                    />
                )
            }
        </div >
    );
}

// =================== COMPARISON SLIDER COMPONENT ===================

interface ComparisonModalProps {
    originalUrl: string;
    enhancedUrl: string;
    originalSize: number;
    enhancedSize: number;
    onConfirm: () => void;
    onCancel: () => void;
}

function ComparisonModal({ originalUrl, enhancedUrl, originalSize, enhancedSize, onConfirm, onCancel }: ComparisonModalProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(50); // percentage
    const isDragging = useRef(false);

    const updatePosition = useCallback((clientX: number) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setPosition(pct);
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        isDragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updatePosition(e.clientX);
    }, [updatePosition]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        updatePosition(e.clientX);
    }, [updatePosition]);

    const handlePointerUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4 lg:p-8">
            <div className="bg-[#080808] border border-white/10 rounded-[3px] shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-3 border-b border-white/10 bg-[#050505] shrink-0">
                    <h2 className="font-mono text-xs uppercase tracking-widest text-white/80 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        Compare Before Download
                    </h2>
                    <button onClick={onCancel} className="text-white/50 hover:text-white/90 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Slider Area */}
                <div
                    ref={containerRef}
                    className="relative flex-1 overflow-hidden bg-black select-none"
                    style={{ cursor: "ew-resize", touchAction: "none" }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                >
                    {/* ORIGINAL image — full width, always visible as the base layer */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={originalUrl}
                        alt="Original"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        draggable={false}
                    />

                    {/* ENHANCED image — same position & size, clipped by clip-path */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={enhancedUrl}
                        alt="Enhanced"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        draggable={false}
                        style={{
                            clipPath: `inset(0 0 0 ${position}%)`,
                        }}
                    />

                    {/* Divider line + handle */}
                    <div
                        className="absolute top-0 bottom-0 pointer-events-none z-10"
                        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
                    >
                        {/* Vertical line */}
                        <div className="w-[2px] h-full bg-white/80 mx-auto" />

                        {/* Drag handle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border-2 border-white/80 backdrop-blur-md flex items-center justify-center shadow-2xl">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M5 3L2 8L5 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M11 3L14 8L11 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* Labels */}
                    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-[3px] font-mono text-[10px] text-white/80 uppercase tracking-widest pointer-events-none border border-white/10 z-20">
                        Original · {formatFileSize(originalSize)}
                    </div>
                    <div className="absolute top-4 right-4 bg-emerald-600/30 backdrop-blur-md px-3 py-1.5 rounded-[3px] font-mono text-[10px] text-emerald-300 uppercase tracking-widest pointer-events-none border border-emerald-500/30 z-20">
                        Enhanced · {formatFileSize(enhancedSize)}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-[#050505] border-t border-white/10 flex items-center justify-between shrink-0">
                    <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Drag to compare</p>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={onCancel}
                            className="font-mono text-[11px] uppercase tracking-widest text-white/60 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onConfirm}
                            className="font-mono text-[11px] uppercase tracking-widest bg-emerald-500 text-black hover:bg-emerald-400 h-10 px-6 rounded-[2px]"
                        >
                            <Download className="w-3.5 h-3.5 mr-2" />
                            Accept & Download
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
