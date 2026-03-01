/**
 * localStorage wrapper for processing history.
 * Silently saves records — no UI, just data persistence.
 */

export interface HistoryRecord {
    id: string;
    originalName: string;
    originalSize: number;
    processedSize: number;
    targetSize: number;
    format: string;
    action: "upscale" | "downscale";
    timestamp: number;
}

const STORAGE_KEY = "imageforge_history";
const MAX_RECORDS = 50;

export function saveRecord(record: Omit<HistoryRecord, "id" | "timestamp">) {
    try {
        const records = getRecords();
        records.unshift({
            ...record,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        });
        // Keep only latest entries
        const trimmed = records.slice(0, MAX_RECORDS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
        // localStorage might be full or unavailable — silently fail
    }
}

export function getRecords(): HistoryRecord[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function clearRecords() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // silently fail
    }
}
