"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
    onFileSelect: (file: File) => void;
    variant?: "dark" | "light" | "glass" | "apple";
    fillHeight?: boolean;
}

export function DropZone({ onFileSelect, variant = "dark", fillHeight = false }: DropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(
        (file: File) => {
            if (file.type.startsWith("image/")) {
                onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(true);

        const handler = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) handleFile(file);
                }
            }
        };
        document.addEventListener("paste", handler);
        return () => document.removeEventListener("paste", handler);
    }, [handleFile]);

    const isMac = typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("mac");
    const pasteMessage = isMounted ? `Click to browse · ${isMac ? "⌘V" : "Ctrl+V"} to paste` : "Click to browse or paste image";

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    };

    // Dynamic styling based on variant structure
    const containerStyles = {
        dark: {
            base: "border-dashed border-[#C9A96E]/30 bg-[#C9A96E]/[0.02] shadow-[0_0_15px_rgba(201,169,110,0.05)]",
            hover: "hover:border-solid hover:border-[#C9A96E]/60 hover:bg-[#C9A96E]/[0.04]",
            active: "border-solid border-[#C9A96E]/50 bg-[#C9A96E]/[0.05]",
            icon: "text-[#C9A96E]/40 group-hover:text-[#C9A96E]/70",
            textPri: "text-[#C9A96E]/70",
            textSec: "text-[#C9A96E]/40",
            textHover: "hover:text-[#C9A96E]/90",
        },
        light: {
            base: "border-dashed border-[#1A1A1A]/10 bg-[#1A1A1A]/[0.02]",
            hover: "hover:border-solid hover:border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/[0.04]",
            active: "border-solid border-[#1A1A1A]/30 bg-[#1A1A1A]/[0.04]",
            icon: "text-[#1A1A1A]/25 group-hover:text-[#1A1A1A]/45",
            textPri: "text-[#1A1A1A]/45",
            textSec: "text-[#1A1A1A]/25",
            textHover: "hover:text-[#1A1A1A]",
        },
        glass: {
            base: "border-white/40 bg-white/10 backdrop-blur-xl shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]",
            hover: "hover:border-white/60 hover:bg-white/20 hover:shadow-[inset_0_0_30px_rgba(255,255,255,0.4)]",
            active: "border-white bg-white/30 backdrop-blur-2xl shadow-[inset_0_0_40px_rgba(255,255,255,0.6)]",
            icon: "text-[#1D1D1F]/70 drop-shadow-sm",
            textPri: "text-[#1D1D1F]/90 font-semibold drop-shadow-sm",
            textSec: "text-[#1D1D1F]/50 font-medium",
            textHover: "hover:text-[#1D1D1F]",
        },
        apple: {
            base: "border-black/30 bg-white shadow-[0_0_30px_rgba(0,0,0,0.08)]",
            hover: "hover:border-black hover:bg-white hover:shadow-[0_0_40px_rgba(0,0,0,0.15)]",
            active: "border-black bg-[#fafafa] shadow-[0_0_50px_rgba(0,0,0,0.2)]",
            icon: "text-[#1D1D1F]/80",
            textPri: "text-[#1D1D1F] font-semibold",
            textSec: "text-[#86868B] font-medium",
            textHover: "hover:text-[#1D1D1F]",
        }
    };

    const currentStyle = containerStyles[variant];

    return (
        <div
            id="drop-zone"
            className={`group flex flex-col items-center justify-center ${fillHeight ? "flex-1 w-full h-full min-h-0" : "py-20"} cursor-pointer rounded-[24px] border border-solid transition-all duration-300 ${isDragging ? currentStyle.active : currentStyle.base} ${!isDragging && currentStyle.hover} relative overflow-hidden`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
        >
            {/* Soft inner glow for glass variant on hover */}
            {variant === 'glass' && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                    e.target.files?.[0] && handleFile(e.target.files[0])
                }
            />

            <div className={`p-4 rounded-full ${variant === 'glass' ? 'bg-white/30 shadow-sm backdrop-blur-md mb-6 transition-all group-hover:bg-white/40' : variant === 'apple' ? 'bg-[#F5F5F7] mb-6' : 'bg-black/5 mb-4'}`}>
                <Upload
                    className={`w-6 h-6 transition-all duration-300 ${isDragging ? "-translate-y-1 scale-110" : "group-hover:scale-105"} ${currentStyle.icon}`}
                    strokeWidth={1.5}
                />
            </div>

            <p className={`font-mono text-[11px] tracking-[0.2em] relative z-10 ${currentStyle.textPri}`}>
                DROP IMAGE HERE
            </p>
            <p className={`font-mono text-[9px] mt-3 tracking-[0.1em] relative z-10 ${currentStyle.textSec}`}>
                <span className={`uppercase ${currentStyle.textHover} transition-colors`}>
                    {pasteMessage}
                </span>
            </p>
        </div>
    );
}
