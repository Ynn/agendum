export interface NormalizedEvent {
    raw: any; // The raw object from Rust (has fields like summary, start, etc.)
    subject: string;
    type_: string;
    start_iso: string;
    end_iso: string;
    duration_hours: number;
}

export interface Calendar {
    id: string;
    name: string;
    color: string;
    visible: boolean;
    includeInStats: boolean; /* New: Distinguish Service vs Info */
    events: NormalizedEvent[];
    remote?: {
        sourceUrl: string;
        lastSyncedAt: number | null;
        lastAttemptAt: number | null;
        lastManualRefreshAt: number | null;
        lastError: string | null;
    };
}

export interface AppState {
    calendars: Calendar[];
}
