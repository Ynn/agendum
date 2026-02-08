import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Calendar, NormalizedEvent, ParseAndNormalizeDetailedResult } from '../types';
import type { Lang } from '../i18n';
import {
  AUTO_REFRESH_MS,
  buildFetchUrlFromSource,
  calendarNameFromUrl,
  msUntilManualRefreshAllowed,
} from '../utils/remoteCalendars';
import { buildParserFatalMessage, buildParserWarningMessage } from '../utils/parseDiagnostics';

type UseRemoteCalendarsArgs = {
  calendars: Calendar[];
  isParserReady: boolean;
  lang: Lang;
  parseIcsDetailed: (content: string) => Promise<ParseAndNormalizeDetailedResult>;
  setCalendars: Dispatch<SetStateAction<Calendar[]>>;
  savePersistedCalendars: (calendars: Calendar[], mainCalendarId?: string) => Promise<void>;
  onImport: (
    name: string,
    events: NormalizedEvent[],
    isService: boolean,
    sourceUrl?: string,
    lastSyncedAt?: number,
    lastWarning?: string | null,
  ) => void;
};

export function useRemoteCalendars({
  calendars,
  isParserReady,
  lang,
  parseIcsDetailed,
  setCalendars,
  savePersistedCalendars,
  onImport,
}: UseRemoteCalendarsArgs) {
  const [refreshingIds, setRefreshingIds] = useState<Record<string, boolean>>({});

  const fetchRemoteCalendarEvents = useCallback(async (sourceUrl: string) => {
    const targetUrl = buildFetchUrlFromSource(sourceUrl);
    let response: Response;
    try {
      response = await fetch(targetUrl, { method: 'GET', cache: 'no-store' });
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('Impossible de joindre le proxy (CORS/réseau). Vérifiez le worker local et son origine autorisée.');
      }
      throw err;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const parsed = await parseIcsDetailed(text);
    const events = Array.isArray(parsed?.events) ? parsed.events : [];
    const diagnostics = parsed?.diagnostics;

    if (diagnostics?.parser_errors && events.length === 0) {
      throw new Error(buildParserFatalMessage(diagnostics, lang, 'calendar'));
    }

    return {
      events,
      warning: buildParserWarningMessage(diagnostics, lang),
    };
  }, [lang, parseIcsDetailed]);

  const handleImportFromUrl = useCallback(async (url: string, name: string, isService: boolean) => {
    const { events, warning } = await fetchRemoteCalendarEvents(url);
    const calendarName = name.trim() || calendarNameFromUrl(url);
    onImport(calendarName, events, isService, url, Date.now(), warning);
  }, [fetchRemoteCalendarEvents, onImport]);

  const refreshRemoteCalendar = useCallback(async (id: string, isManual: boolean) => {
    const calendar = calendars.find((c) => c.id === id);
    if (!calendar?.remote?.sourceUrl) return;
    if (refreshingIds[id]) return;

    if (isManual) {
      const waitMs = msUntilManualRefreshAllowed(calendar.remote.lastManualRefreshAt);
      if (waitMs > 0) return;
    }

    setRefreshingIds((prev) => ({ ...prev, [id]: true }));
    const attemptAt = Date.now();
    const markAttempt = calendars.map((c) => c.id === id && c.remote
      ? {
        ...c,
        remote: {
          ...c.remote,
          lastAttemptAt: attemptAt,
          lastManualRefreshAt: isManual ? attemptAt : c.remote.lastManualRefreshAt,
        }
      }
      : c
    );
    setCalendars(markAttempt);
    void savePersistedCalendars(markAttempt);

    try {
      const { events, warning } = await fetchRemoteCalendarEvents(calendar.remote.sourceUrl);
      const syncedAt = Date.now();
      const updated = markAttempt.map((c) => c.id === id && c.remote
        ? {
          ...c,
          events,
          remote: {
            ...c.remote,
            lastSyncedAt: syncedAt,
            lastAttemptAt: syncedAt,
            lastError: null,
            lastWarning: warning,
          }
        }
        : c
      );
      setCalendars(updated);
      void savePersistedCalendars(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      const updated = markAttempt.map((c) => c.id === id && c.remote
        ? {
          ...c,
          remote: {
            ...c.remote,
            lastError: message,
            lastWarning: null,
          }
        }
        : c
      );
      setCalendars(updated);
      void savePersistedCalendars(updated);
    } finally {
      setRefreshingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [calendars, fetchRemoteCalendarEvents, refreshingIds, savePersistedCalendars, setCalendars]);

  useEffect(() => {
    if (!isParserReady) return;

    const refreshDueCalendars = () => {
      calendars
        .filter((c) => c.remote?.sourceUrl)
        .filter((c) => {
          const lastAttemptAt = c.remote?.lastAttemptAt ?? c.remote?.lastSyncedAt ?? null;
          if (!lastAttemptAt) return true;
          return Date.now() - lastAttemptAt >= AUTO_REFRESH_MS;
        })
        .forEach((c) => {
          void refreshRemoteCalendar(c.id, false);
        });
    };

    refreshDueCalendars();
    const timer = window.setInterval(refreshDueCalendars, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [calendars, isParserReady, refreshRemoteCalendar]);

  return {
    handleImportFromUrl,
    refreshRemoteCalendar,
  };
}
