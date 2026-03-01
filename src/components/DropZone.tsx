"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
    onFileSelect: (file: File) => void;
}

export function DropZone({ onFileSelect }: DropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
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

    return (
        <div
            id="drop-zone"
            className={`group flex flex-col items-center justify-center py-20 cursor-pointer rounded-[3px] border transition-all duration-300 ${isDragging
                ? "border-white/20 bg-white/[0.03]"
                : "border-white/[0.06] hover:border-white/10 bg-white/[0.015] hover:bg-white/[0.025]"
                }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                    e.target.files?.[0] && handleFile(e.target.files[0])
                }
            />

            <Upload
                className={`w-5 h-5 mb-5 transition-all duration-300 ${isDragging
                    ? "text-white/60 -translate-y-1"
                    : "text-white/30 group-hover:text-white/50"
                    }`}
                strokeWidth={1.5}
            />

            <p className="font-mono text-[12px] uppercase tracking-[0.15em] text-white/50 mb-1">
                Drop image here
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                Click to browse · ⌘V to paste
            </p>
        </div>
    );
}
