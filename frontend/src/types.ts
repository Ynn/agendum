export interface RawEvent {
    uid: string;
    summary: string;
    description: string;
    location: string;
    start: string;
    end: string;
}

export interface NormalizedEvent {
    raw: RawEvent;
    subject: string;
    type_: string;
    start_iso: string;
    end_iso: string;
    duration_hours: number;
    teachers: string[];
    promos: string[];
    cleaned_description: string;
}

export interface EnrichedEvent extends NormalizedEvent {
    start_date?: Date;
    end_date?: Date;
    start_ts?: number;
    end_ts?: number;
    color: string;
    stats_included: boolean;
    calendarName: string;
    calendarId: string;
    isVisible: boolean;
    extractedTeacher: string;
    promo: string;
    is_duplicate: boolean;
}

export interface ParseDiagnostics {
    calendars_parsed: number;
    parser_errors: number;
    skipped_events_without_uid: number;
    parser_error_messages: string[];
}

export interface ParseAndNormalizeDetailedResult {
    events: NormalizedEvent[];
    diagnostics: ParseDiagnostics;
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
        lastWarning: string | null;
    };
}

export interface AppState {
    calendars: Calendar[];
}
