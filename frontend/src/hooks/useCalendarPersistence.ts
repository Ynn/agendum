import { useCallback } from 'react';
import { openDB } from 'idb';
import type { Calendar, NormalizedEvent } from '../types';

// DB Config
const DB_NAME = 'agendum-db';
const STORE_NAME = 'events';
const DB_VERSION = 2;

export type NormalizationRules = {
  teachers: Record<string, string>;
  promos: Record<string, string>;
  subjects: Record<string, string>;
  hidden: {
    teachers: Record<string, boolean>;
    promos: Record<string, boolean>;
    subjects: Record<string, boolean>;
  };
};

export type PersistedState = {
  calendars: Calendar[];
  mainCalendarId: string | null;
  normalizationRules: NormalizationRules;
};

const getDB = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

const withEventDefaults = (event: NormalizedEvent): NormalizedEvent => ({
  ...event,
  teachers: Array.isArray(event.teachers) ? event.teachers : [],
  promos: Array.isArray(event.promos) ? event.promos : [],
  cleaned_description: typeof event.cleaned_description === 'string' ? event.cleaned_description : '',
});

const withCalendarDefaults = (cal: Calendar): Calendar => ({
  ...cal,
  visible: cal.visible ?? true,
  includeInStats: cal.includeInStats ?? true,
  events: Array.isArray(cal.events) ? cal.events.map(withEventDefaults) : [],
  remote: cal.remote
    ? {
      sourceUrl: cal.remote.sourceUrl,
      lastSyncedAt: cal.remote.lastSyncedAt ?? null,
      lastAttemptAt: cal.remote.lastAttemptAt ?? cal.remote.lastSyncedAt ?? null,
      lastManualRefreshAt: cal.remote.lastManualRefreshAt ?? null,
      lastError: cal.remote.lastError ?? null,
      lastWarning: cal.remote.lastWarning ?? null,
    }
    : undefined,
});

export const createDefaultNormalizationRules = (): NormalizationRules => ({
  teachers: {},
  promos: {},
  subjects: {},
  hidden: { teachers: {}, promos: {}, subjects: {} },
});

const coerceNormalizationRules = (input: unknown): NormalizationRules => {
  const base = (input || {}) as Partial<NormalizationRules>;
  return {
    teachers: base.teachers || {},
    promos: base.promos || {},
    subjects: base.subjects || {},
    hidden: base.hidden || { teachers: {}, promos: {}, subjects: {} },
  };
};

export function useCalendarPersistence() {
  const loadPersistedState = useCallback(async (legacyColor: string): Promise<PersistedState> => {
    const emptyState: PersistedState = {
      calendars: [],
      mainCalendarId: null,
      normalizationRules: createDefaultNormalizationRules(),
    };

    try {
      const db = await getDB();
      const saved = await db.get(STORE_NAME, 'current_schedule');
      const savedMainId = await db.get(STORE_NAME, 'main_calendar_id');
      const savedRules = await db.get(STORE_NAME, 'normalization_rules');

      let calendars = emptyState.calendars;
      let mainCalendarId = emptyState.mainCalendarId;
      const normalizationRules = savedRules
        ? coerceNormalizationRules(savedRules)
        : emptyState.normalizationRules;

      if (typeof savedMainId === 'string' && savedMainId) {
        mainCalendarId = savedMainId;
      }

      if (saved) {
        if (Array.isArray(saved) && saved.length > 0 && !('events' in saved[0])) {
          // Legacy migration from single flat array of events.
          const legacyId = 'legacy';
          calendars = [{
            id: legacyId,
            name: 'Imported Schedule',
            color: legacyColor,
            visible: true,
            includeInStats: true,
            events: (saved as NormalizedEvent[]).map(withEventDefaults),
          }];
          mainCalendarId = legacyId;
        } else {
          calendars = (saved as Calendar[]).map(withCalendarDefaults);
        }
      }

      return { calendars, mainCalendarId, normalizationRules };
    } catch (err) {
      console.warn('IndexedDB unavailable, using localStorage fallback', err);
      try {
        const raw = localStorage.getItem('agendum_state_calendars');
        const mainId = localStorage.getItem('agendum_state_main_id');
        const rulesRaw = localStorage.getItem('agendum_state_norm_rules');
        const calendars = raw ? (JSON.parse(raw) as Calendar[]).map(withCalendarDefaults) : [];
        const normalizationRules = rulesRaw
          ? coerceNormalizationRules(JSON.parse(rulesRaw) as Partial<NormalizationRules>)
          : createDefaultNormalizationRules();
        const mainCalendarId = mainId || null;

        return { calendars, mainCalendarId, normalizationRules };
      } catch (e2) {
        console.error('Fallback state load failed', e2);
        return emptyState;
      }
    }
  }, []);

  const savePersistedCalendars = useCallback(async (calendars: Calendar[], mainCalendarId?: string) => {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, calendars, 'current_schedule');
      if (mainCalendarId !== undefined) {
        await db.put(STORE_NAME, mainCalendarId, 'main_calendar_id');
      }
    } catch (err) {
      console.warn('IndexedDB save failed, using localStorage fallback', err);
      try {
        localStorage.setItem('agendum_state_calendars', JSON.stringify(calendars));
        if (mainCalendarId !== undefined) {
          localStorage.setItem('agendum_state_main_id', mainCalendarId);
        }
      } catch (e2) {
        console.error('Fallback state save failed', e2);
      }
    }
  }, []);

  const savePersistedRules = useCallback(async (rules: NormalizationRules) => {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, rules, 'normalization_rules');
    } catch (err) {
      console.warn('IndexedDB save rules failed, using localStorage fallback', err);
      try {
        localStorage.setItem('agendum_state_norm_rules', JSON.stringify(rules));
      } catch (e2) {
        console.error('Fallback rules save failed', e2);
      }
    }
  }, []);

  const purgePersistedState = useCallback(async () => {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, 'current_schedule');
      await db.delete(STORE_NAME, 'main_calendar_id');
      await db.delete(STORE_NAME, 'normalization_rules');
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem('agendum_state_calendars');
      localStorage.removeItem('agendum_state_main_id');
      localStorage.removeItem('agendum_state_norm_rules');
    } catch {
      // ignore
    }
  }, []);

  return {
    loadPersistedState,
    savePersistedCalendars,
    savePersistedRules,
    purgePersistedState,
  };
}
