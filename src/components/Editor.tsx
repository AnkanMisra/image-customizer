"use client";

import React, { useState, useEffect } from "react";
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
import { Download, X, Loader2, Zap, Monitor } from "lucide-react";
import {
    processImage,
    formatFileSize,
    getFormatExtension,
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

    useEffect(() => {
        loadWasm().then((w) => setWasmReady(!!w));

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

        return () => URL.revokeObjectURL(url);
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
            });

            const url = URL.createObjectURL(result.blob);
            const a = document.createElement("a");
            const baseName = file.name.replace(/\.[^.]+$/, "");
            a.href = url;
            a.download = `${baseName}_resized.${getFormatExtension(result.format)}`;
            a.click();
            URL.revokeObjectURL(url);

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

            toast.success(`Done in ${timeStr}`);
        } catch (err) {
            console.error(err);
            toast.error("Processing failed");
        } finally {
            setIsProcessing(false);
            setProgress(0);
            setProgressMsg("");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-px rounded-[3px] border border-white/15 overflow-hidden animate-in fade-in duration-400">
            {/* Preview — 3 cols */}
            <div className="relative lg:col-span-3 bg-[#060606]">
                <div className="relative aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {previewUrl && (
                        <img
                            src={previewUrl}
                            alt="Preview"
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
        </div>
    );
}
