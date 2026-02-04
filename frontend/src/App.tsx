import { useCallback, useEffect, useMemo, useState } from 'react';
import init, { parse_and_normalize } from './pkg/agendum_core';
import { openDB } from 'idb';
import { ServiceDashboard } from './views/ServiceDashboard';
import { Agenda } from './views/Agenda';
import { Settings } from './views/Settings';
import { CourseExplorer } from './views/CourseExplorer';
import { Fix } from './views/Fix';
import { SearchResults } from './views/SearchResults';
import type { Calendar, NormalizedEvent } from './types';
import { AdvancedFilters, initialFilters } from './components/AdvancedFilters';
import type { FilterState } from './components/AdvancedFilters';
import { LangContext, detectLang, strings, type Lang } from './i18n';
import {
  AUTO_REFRESH_MS,
  buildFetchUrlFromSource,
  calendarNameFromUrl,
  msUntilManualRefreshAllowed,
} from './utils/remoteCalendars';
import './index.css';

// DB Config
const DB_NAME = 'agendum-db';
const STORE_NAME = 'events';
const DB_VERSION = 2;

const pad2 = (num: number) => num.toString().padStart(2, '0');

const toLocalDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseIcsDateTime = (raw?: string): Date | null => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const compact = value.replace(/[-:]/g, '');
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/i.exec(compact);
  if (!m) return null;
  const [, y, mo, d, hh = '00', mm = '00', ss = '00', z] = m;
  if (z) {
    return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
  }
  return new Date(+y, +mo - 1, +d, +hh, +mm, +ss);
};

const parseTimeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const getDB = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

type View = 'agenda' | 'courses' | 'stats' | 'settings' | 'search' | 'fix';

type NormalizationRules = {
  teachers: Record<string, string>;
  promos: Record<string, string>;
  subjects: Record<string, string>;
  hidden: {
    teachers: Record<string, boolean>;
    promos: Record<string, boolean>;
    subjects: Record<string, boolean>;
  };
};

const withCalendarDefaults = (cal: Calendar): Calendar => ({
  ...cal,
  includeInStats: cal.includeInStats ?? true,
  remote: cal.remote
    ? {
      sourceUrl: cal.remote.sourceUrl,
      lastSyncedAt: cal.remote.lastSyncedAt ?? null,
      lastAttemptAt: cal.remote.lastAttemptAt ?? cal.remote.lastSyncedAt ?? null,
      lastManualRefreshAt: cal.remote.lastManualRefreshAt ?? null,
      lastError: cal.remote.lastError ?? null,
    }
    : undefined,
});

export default function App() {
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [view, setView] = useState<View>('agenda');
  const [mainCalendarId, setMainCalendarId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('agendum_lang');
      if (saved === 'fr' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return detectLang();
  });
  const [selectedTeacher, setSelectedTeacher] = useState<string>(() => {
    try {
      return localStorage.getItem('agendum_teacher') || '';
    } catch {
      return '';
    }
  });
  const [normalizationRules, setNormalizationRules] = useState<NormalizationRules>({
    teachers: {}, promos: {}, subjects: {},
    hidden: { teachers: {}, promos: {}, subjects: {} }
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [refreshingIds, setRefreshingIds] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1024px)').matches;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Colors for new calendars
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
  const t = strings[lang] ?? strings.en;
  const filtersActive = useMemo(() => {
    if (filters.dateStart || filters.dateEnd || filters.startTime || filters.endTime) return true;
    if (filters.source !== 'service') return true;
    if (filters.days.length !== 7) return true;
    return false;
  }, [filters]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqMobile = window.matchMedia('(max-width: 768px)');
    const mqTablet = window.matchMedia('(max-width: 1024px)');
    const onMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const onTabletChange = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    setIsMobile(mqMobile.matches);
    setIsTablet(mqTablet.matches);
    mqMobile.addEventListener('change', onMobileChange);
    mqTablet.addEventListener('change', onTabletChange);
    return () => {
      mqMobile.removeEventListener('change', onMobileChange);
      mqTablet.removeEventListener('change', onTabletChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    (async () => {
      try {
        await init();
        setIsWasmReady(true);
      } catch (e) {
        console.error('Failed to init WASM', e);
      }
      await loadState();
    })();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('agendum_lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem('agendum_teacher', selectedTeacher);
    } catch {
      // ignore
    }
  }, [selectedTeacher]);

  // Persistence Logic
  const loadState = async () => {
    try {
      const db = await getDB();
      const saved = await db.get(STORE_NAME, 'current_schedule');
      const savedMainId = await db.get(STORE_NAME, 'main_calendar_id');
      const savedRules = await db.get(STORE_NAME, 'normalization_rules');

      if (savedMainId) setMainCalendarId(savedMainId);
      if (savedRules) {
        const base = savedRules as NormalizationRules;
        setNormalizationRules({
          teachers: base.teachers || {},
          promos: base.promos || {},
          subjects: base.subjects || {},
          hidden: base.hidden || { teachers: {}, promos: {}, subjects: {} }
        });
      }

      if (saved) {
        if (Array.isArray(saved) && saved.length > 0 && !('events' in saved[0])) {
          // Legacy migration
          const legacyId = 'legacy';
          setCalendars([{
            id: legacyId, name: 'Imported Schedule', color: colors[0], visible: true, includeInStats: true, events: saved as NormalizedEvent[]
          }]);
          setMainCalendarId(legacyId);
        } else {
          const loaded = saved as Calendar[];
          setCalendars(loaded.map(withCalendarDefaults));
        }
        return;
      }
    } catch (err) {
      console.warn('IndexedDB unavailable, using localStorage fallback', err);
      try {
        const raw = localStorage.getItem('agendum_state_calendars');
        const mainId = localStorage.getItem('agendum_state_main_id');
        const rulesRaw = localStorage.getItem('agendum_state_norm_rules');
        if (mainId) setMainCalendarId(mainId);
        if (rulesRaw) {
          const parsed = JSON.parse(rulesRaw) as Partial<NormalizationRules>;
          setNormalizationRules({
            teachers: parsed.teachers || {},
            promos: parsed.promos || {},
            subjects: parsed.subjects || {},
            hidden: parsed.hidden || { teachers: {}, promos: {}, subjects: {} }
          });
        }
        if (raw) {
          const parsed = JSON.parse(raw) as Calendar[];
          setCalendars(parsed.map(withCalendarDefaults));
        }
      } catch (e2) {
        console.error('Fallback state load failed', e2);
      }
    }
  };

  const saveState = async (newCalendars: Calendar[], newMainId?: string) => {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, newCalendars, 'current_schedule');
      if (newMainId !== undefined) await db.put(STORE_NAME, newMainId, 'main_calendar_id');
    } catch (err) {
      console.warn('IndexedDB save failed, using localStorage fallback', err);
      try {
        localStorage.setItem('agendum_state_calendars', JSON.stringify(newCalendars));
        if (newMainId !== undefined) localStorage.setItem('agendum_state_main_id', newMainId);
      } catch (e2) {
        console.error('Fallback state save failed', e2);
      }
    }
  };

  const saveRules = async (rules: NormalizationRules) => {
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
  };

  useEffect(() => {
    saveRules(normalizationRules);
  }, [normalizationRules]);

  const handleImport = (
    name: string,
    events: NormalizedEvent[],
    isService: boolean,
    sourceUrl?: string,
    lastSyncedAt?: number,
  ) => {
    const newId = Date.now().toString();
    const newCal: Calendar = {
      id: newId,
      name: name,
      color: colors[calendars.length % colors.length],
      visible: true,
      includeInStats: isService,
      events: events,
      remote: sourceUrl
        ? {
          sourceUrl,
          lastSyncedAt: lastSyncedAt ?? Date.now(),
          lastAttemptAt: lastSyncedAt ?? Date.now(),
          lastManualRefreshAt: null,
          lastError: null,
        }
        : undefined,
    };
    const updated = [...calendars, newCal];
    setCalendars(updated);

    // If first calendar, make it main
    const newMain = calendars.length === 0 ? newId : mainCalendarId;
    if (calendars.length === 0 && newMain) setMainCalendarId(newMain);

    saveState(updated, newMain || undefined);
  };

  const fetchRemoteCalendarEvents = useCallback(async (sourceUrl: string) => {
    const targetUrl = buildFetchUrlFromSource(sourceUrl);
    const response = await fetch(targetUrl, { method: 'GET', cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    return parse_and_normalize(text);
  }, []);

  const handleImportFromUrl = useCallback(async (url: string, name: string, isService: boolean) => {
    const events = await fetchRemoteCalendarEvents(url);
    const calendarName = name.trim() || calendarNameFromUrl(url);
    handleImport(calendarName, events, isService, url, Date.now());
  }, [fetchRemoteCalendarEvents, handleImport]);

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
    saveState(markAttempt);

    try {
      const events = await fetchRemoteCalendarEvents(calendar.remote.sourceUrl);
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
          }
        }
        : c
      );
      setCalendars(updated);
      saveState(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      const updated = markAttempt.map((c) => c.id === id && c.remote
        ? {
          ...c,
          remote: {
            ...c.remote,
            lastError: message,
          }
        }
        : c
      );
      setCalendars(updated);
      saveState(updated);
    } finally {
      setRefreshingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [calendars, fetchRemoteCalendarEvents, refreshingIds]);

  useEffect(() => {
    if (!isWasmReady) return;

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
  }, [calendars, isWasmReady, refreshRemoteCalendar]);

  const handleRemoveCalendar = (id: string) => {
    const updated = calendars.filter(c => c.id !== id);
    setCalendars(updated);
    if (mainCalendarId === id) setMainCalendarId(null);
    saveState(updated, mainCalendarId === id ? '' : undefined);
  };

  const handleToggleCalendar = (id: string) => {
    const updated = calendars.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
    setCalendars(updated);
    saveState(updated);
  };

  const handleToggleStats = (id: string) => {
    const updated = calendars.map(c => c.id === id ? { ...c, includeInStats: !c.includeInStats } : c);
    setCalendars(updated);
    saveState(updated);
  };

  const handleRenameCalendar = (id: string, name: string) => {
    const updated = calendars.map((c) => c.id === id ? { ...c, name } : c);
    setCalendars(updated);
    saveState(updated);
  };

  // --- Derived Datasets ---

  // 1. All events flat list (for Course Explorer & Stats & General Search)
  const allEvents = useMemo(() => {
    const nameInlineRegex = /[A-ZÉÈÀÂÊÎÔÛÄËÏÖÜŸÇ][\p{L}'\-]+\s+[A-ZÉÈÀÂÊÎÔÛÄËÏÖÜŸÇ][\p{L}'\-]+/gu;

    const normalizeDescription = (desc: string) => desc.replace(/\\n/g, '\n').replace(/\r/g, '\n');

    const stopWords = ['licence', 'license', 'master', 'promo', 'parcours', 'but', 'dut', 'lp', 'sph', 'services', 'produits', 'habitat', 'ingenierie', 'ingénierie', 'info', 'alternant', 'classique'];

    const normalizeValue = (
      map: Record<string, string>,
      hideMap: Record<string, boolean>,
      value: string
    ) => {
      const trimmed = (value || '').trim();
      if (hideMap[trimmed]) return '';
      const candidate = map[trimmed];
      return candidate ? candidate.trim() : trimmed;
    };

    const isLikelyName = (token: string) => {
      const cleaned = token.trim().replace(/\s+/g, ' ');
      if (!cleaned) return false;
      const lower = cleaned.toLowerCase();
      if (stopWords.some(w => lower.includes(w))) return false;
      const parts = cleaned.split(' ');
      if (parts.length < 2 || parts.length > 3) return false;
      return parts.every(p => /^[A-ZÉÈÀÂÊÎÔÛÄËÏÖÜŸÇ][\p{L}'\-]+$/u.test(p));
    };

    const extractMeta = (ev: NormalizedEvent) => {
      const rawDesc = normalizeDescription(ev.raw.description || '').trim();
      if (!rawDesc) return { teachers: ['—'], promo: '' };

      // Strip "Modifié le" noise often appended to promo lines
      const desc = rawDesc
        .replace(/\((?=[^)]*modifi[eé]\s*le)[^)]*\)/gi, '')
        .replace(/modifi[eé]\s*le:?[^\n]*/gi, '')
        .trim();

      const lines = desc
        .split(/\n+/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0 && !/modifi[eé]\s*le/i.test(l));

      const teacherSet = new Set<string>();
      const promoCandidates: string[] = [];

      // Split on commas/semicolons to isolate names from promo lines
      const tokens = lines.flatMap(l => l.split(/[,;]+/).map(part => part.trim()).filter(Boolean));

      tokens.forEach(tok => {
        if (isLikelyName(tok)) teacherSet.add(tok);
        else promoCandidates.push(tok);
      });

      // Try to extract inline matches when lines are folded or cluttered
      if (teacherSet.size === 0) {
        const inlineMatches = Array.from(desc.matchAll(nameInlineRegex)).map(m => m[0].trim());
        inlineMatches.forEach(m => {
          if (isLikelyName(m)) teacherSet.add(m);
        });
      }

      const promoLine = promoCandidates.find(Boolean) || '';

      // fallback for teachers
      if (teacherSet.size === 0) teacherSet.add(promoLine || '—');

      const teachersNormalized = Array.from(teacherSet)
        .map(t => normalizeValue(normalizationRules.teachers, normalizationRules.hidden.teachers, t))
        .filter(Boolean);
      const promoNormalized = normalizeValue(normalizationRules.promos, normalizationRules.hidden.promos, promoLine);

      return { teachers: Array.from(new Set(teachersNormalized)), promo: promoNormalized };
    };

    const rawEvents = calendars
      .flatMap(cal => cal.events.map(ev => {
        const startDate = parseIcsDateTime(ev.start_iso);
        const endDate = parseIcsDateTime(ev.end_iso);
        const startMs = startDate?.getTime() ?? NaN;
        const endMs = endDate?.getTime() ?? NaN;
        const computedDuration = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
          ? (endMs - startMs) / 36e5
          : 0;
        const durationHours = ev.duration_hours && ev.duration_hours > 0 ? ev.duration_hours : computedDuration;

        return {
          ...ev,
          duration_hours: durationHours,
          start_date: startDate ?? undefined,
          end_date: endDate ?? undefined,
          start_ts: Number.isFinite(startMs) ? startMs : undefined,
          end_ts: Number.isFinite(endMs) ? endMs : undefined,
          color: cal.color,
          stats_included: cal.includeInStats,
          calendarName: cal.name,
          calendarId: cal.id,
          isVisible: cal.visible,
          ...(() => {
            const meta = extractMeta(ev);
            const subjectNormalized = normalizeValue(normalizationRules.subjects, normalizationRules.hidden.subjects, ev.subject || '');
            return {
              subject: subjectNormalized,
              extractedTeacher: meta.teachers.join(', '),
              promo: meta.promo,
            };
          })()
        };
      }));

    // Smart Deduplication for Stats
    // If multiple events match (Same Start, Same End, Same Subject, Same Type), and are marked for stats,
    // we should only count them ONCE for the total service logic.
    // However, we still want to keep them in the array for list display (Course Explorer).
    // The ServiceDashboard will handle the stats aggregation.
    // BUT: The user asked "Same slot given by same person to multiple promos ... appear once".
    // "It appears once" implies Visual Deduplication too?
    // Let's implement a flag `is_duplicate` so views can choose to hide or skip it.

    const seen = new Set<string>();
    return rawEvents.map(ev => {
      // Create a unique fingerprint
      // We use Subject + Type + Start + End + Duration
      // Note: We don't have "Teacher" explicitly yet without regex, so we assume if I import 2 calendars
      // and they conflict, it's the same teacher (me) or a conflict.
      if (!ev.stats_included) return ev; // Don't dedupe informational stuff, or do we?

      const key = `${ev.start_iso}|${ev.end_iso}|${ev.subject}|${ev.type_}|${(ev as any).extractedTeacher}`;
      if (seen.has(key)) {
        return { ...ev, is_duplicate: true };
      }
      seen.add(key);
      return { ...ev, is_duplicate: false };
    });
  }, [calendars, normalizationRules]);

  const serviceEvents = useMemo(() => {
    return allEvents.filter(ev => (ev as any).stats_included !== false);
  }, [allEvents]);

  const teacherOptions = useMemo(() => {
    const counts = new Map<string, number>();
    serviceEvents.forEach(ev => {
      const teacherStr = ((ev as any).extractedTeacher || '').trim();
      teacherStr
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t && t !== '—' && t.toLowerCase() !== 'unknown teacher')
        .forEach((t: string) => counts.set(t, (counts.get(t) || 0) + 1));
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [serviceEvents]);

  const applyFilters = (sourceOverride?: FilterState['source']) => {
    let result = allEvents;
    const source = sourceOverride ?? filters.source;

    // Source filter (calendar scope)
    switch (source) {
      case 'service':
        result = result.filter(ev => (ev as any).stats_included !== false);
        break;
      case 'main':
        result = mainCalendarId ? result.filter(ev => (ev as any).calendarId === mainCalendarId) : [];
        break;
      case 'visible':
        result = result.filter(ev => (ev as any).isVisible);
        break;
      case 'all':
      default:
        break;
    }

    // 0. Deduplication (Visual/Stats logic is separate, but global filter applies first)

    // 1. Advanced Filters
    // Date Range
    if (filters.dateStart) {
      result = result.filter(ev => {
        const d = (ev as any).start_date as Date | undefined;
        if (!d) return false;
        return toLocalDateKey(d) >= filters.dateStart;
      });
    }
    if (filters.dateEnd) {
      result = result.filter(ev => {
        const d = (ev as any).start_date as Date | undefined;
        if (!d) return false;
        return toLocalDateKey(d) <= filters.dateEnd;
      });
    }

    // Time Range (Daily) - overlap-aware
    const startMin = filters.startTime ? parseTimeToMinutes(filters.startTime) : null;
    const endMin = filters.endTime ? parseTimeToMinutes(filters.endTime) : null;
    if (startMin !== null || endMin !== null) {
      result = result.filter(ev => {
        const startDate = (ev as any).start_date as Date | undefined;
        const endDate = (ev as any).end_date as Date | undefined;
        if (!startDate || !endDate) return false;
        const evStart = startDate.getHours() * 60 + startDate.getMinutes();
        const evEnd = endDate.getHours() * 60 + endDate.getMinutes();
        if (startMin !== null && endMin !== null) {
          return evStart <= endMin && evEnd >= startMin;
        }
        if (startMin !== null) return evEnd >= startMin;
        if (endMin !== null) return evStart <= endMin;
        return true;
      });
    }

    // Days of Week
    if (filters.days.length > 0) {
      result = result.filter(ev => {
        const date = (ev as any).start_date as Date | undefined;
        if (!date) return false;
        let day = date.getDay(); // 0=Sun, 1=Mon
        if (day === 0) day = 7; // Normalize to 1=Mon, 7=Sun
        return filters.days.includes(day);
      });
    }

    return result;
  };

  // Filter Logic (Derived from allEvents)
  const filteredEvents = useMemo(() => applyFilters(), [allEvents, filters, mainCalendarId]);
  const courseEvents = useMemo(() => applyFilters('all'), [allEvents, filters, mainCalendarId]);

  // Derived datasets for Views (Consume filteredEvents)

  // Agenda View: Only Main Calendar + Filtered
  const mainEvents = useMemo(() => {
    // If filters are active (search or advanced), we show matches from ALL calendars? 
    // Or just matches from main? 
    // User request: "Global searches...". Agenda is personal.
    // If advanced filters are ON, maybe we should apply them to Agenda too? Yes.
    if (!mainCalendarId) return [];
    // Filter the *Filtered* events to only include those from Main Calendar
    // This allows filtering your own schedule by time/date.
    return filteredEvents.filter(ev => {
      // Find if this event belongs to main calendar
      // We don't have calendar ID on event directly unless we map it. 
      // We mapped `calendarName`. Let's assume unique names or map ID.
      // Better: Look up in main calendar events? Expensive.
      // Correct: Add `calendarId` to allEvents map.
      return (ev as any).calendarId === mainCalendarId;
    });
  }, [filteredEvents, mainCalendarId]);

  // Search Results uses `filteredEvents` directly
  // Service uses `serviceEvents` (independent from visibility)

  // 3. Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const term = searchQuery.toLowerCase();
    return filteredEvents.filter(ev =>
      (ev.subject && ev.subject.toLowerCase().includes(term)) ||
      (ev.type_ && ev.type_.toLowerCase().includes(term)) ||
      (((ev as any).extractedTeacher || '').toLowerCase().includes(term))
    );
  }, [filteredEvents, searchQuery]);

  // Handle Search Input
  const onSearch = (val: string) => {
    setSearchQuery(val);
    if (val && view !== 'search') setView('search');
  };

  if (!isWasmReady) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>{t.loading_core}</div>;

  return (
    <LangContext.Provider value={lang}>
    <div className="app-container">

      {/* 1. Global Header with Search & Filter */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-color)',
        padding: isMobile ? '0.45rem 0.55rem' : '0.8rem 1rem',
        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem', flexWrap: 'wrap',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        {!isMobile && (
          <>
            <div
              style={{ fontWeight: 800, fontSize: '1.2rem', background: 'linear-gradient(45deg, #2563eb, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }}
              onClick={() => setView('agenda')}
            >
              {t.app_name.toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: '280px', maxWidth: '700px', margin: '0 1rem', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder={`🔍 ${t.search_placeholder}`}
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                style={{
                  flex: 1, padding: '0.6rem 1rem', borderRadius: '20px',
                  border: '1px solid #cbd5e1', background: '#f1f5f9', outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.background = 'white'}
                onBlur={(e) => e.currentTarget.style.background = '#f1f5f9'}
              />
              <button
                onClick={() => setShowFilters(true)}
                className={`btn ${filtersActive ? 'btn-primary' : ''}`}
                style={{ borderRadius: '20px', padding: '0 1rem' }}
              >
                {t.filters} ⇩
              </button>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{t.language}</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                style={{ padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              >
                <option value="fr">{t.language_fr}</option>
                <option value="en">{t.language_en}</option>
              </select>
            </div>
          </>
        )}

        {isMobile && (
          <>
            <div
              style={{ fontWeight: 800, fontSize: '0.95rem', background: 'linear-gradient(45deg, #2563eb, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }}
              onClick={() => setView('agenda')}
            >
              {t.app_name}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                className={`btn ${mobileMenuOpen ? 'btn-primary' : ''}`}
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.78rem' }}
                onClick={() => {
                  setMobileMenuOpen((v) => !v);
                }}
                title={lang === 'fr' ? 'Menu' : 'Menu'}
              >
                ☰
              </button>
            </div>

            {view === 'search' && (
              <div style={{ width: '100%', display: 'flex', gap: '0.35rem' }}>
                <input
                  type="text"
                  placeholder={`🔍 ${t.search_placeholder}`}
                  value={searchQuery}
                  onChange={(e) => onSearch(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.65rem',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    outline: 'none',
                    fontSize: '0.86rem'
                  }}
                />
                <button
                  className={`btn ${filtersActive ? 'btn-primary' : ''}`}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                  onClick={() => setShowFilters(true)}
                >
                  {t.filters}
                </button>
              </div>
            )}

            {mobileMenuOpen && (
              <div style={{
                width: '100%',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.5rem',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                <button className="btn" style={{ padding: '0.24rem 0.45rem', fontSize: '0.75rem' }} onClick={() => setShowFilters(true)}>
                  {t.filters}
                </button>
                <button className="btn" style={{ padding: '0.24rem 0.45rem', fontSize: '0.75rem' }} onClick={() => setView('settings')}>
                  {t.settings}
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.language}</span>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value as Lang)}
                    style={{ padding: '0.2rem 0.35rem', borderRadius: '7px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}
                  >
                    <option value="fr">{t.language_fr}</option>
                    <option value="en">{t.language_en}</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </header>

      {/* 2. Main Content Uses filtered data */}
      <main className="main-content" style={{
        padding: isMobile ? '0.2rem 0.3rem 72px' : '0.5rem 2.5vw 80px',
        maxWidth: '100%',
        margin: '0 auto',
        width: '100%'
      }}>
        <div className="view-shell">
          {view === 'agenda' && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
              {!mainCalendarId && (
                <div style={{ padding: '1rem', background: '#fffbeb', color: '#b45309', borderRadius: 'var(--radius)', marginBottom: '1rem', border: '1px solid #fcd34d' }}>
                  ⚠️ {t.no_main_schedule} {t.go_settings_prefix} <button onClick={() => setView('settings')} style={{ textDecoration: 'underline', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>{t.settings}</button> {t.go_settings_suffix}
                </div>
              )}
              <Agenda events={mainEvents} isMobile={isMobile} /> {/* Only show main teacher events */}
            </div>
          )}

          {view === 'courses' && <CourseExplorer events={courseEvents} isMobile={isMobile} isTablet={isTablet && !isMobile} />}

          {view === 'stats' && (
            <ServiceDashboard
              events={serviceEvents}
              selectedTeacher={selectedTeacher}
              isMobile={isMobile}
            />
          )}

          {view === 'fix' && (
            <Fix
              events={allEvents}
              rules={normalizationRules}
              onUpdateRules={(category, fromValue, toValue) => {
                setNormalizationRules(prev => ({
                  ...prev,
                  [category]: { ...prev[category], [fromValue]: toValue },
                  hidden: { ...prev.hidden }
                }));
              }}
              onRemoveRule={(category, fromValue) => {
                setNormalizationRules(prev => {
                  const updated = { ...prev[category] } as Record<string, string>;
                  delete updated[fromValue];
                  return { ...prev, [category]: updated } as NormalizationRules;
                });
              }}
              onToggleHide={(category, value) => {
                setNormalizationRules(prev => ({
                  ...prev,
                  hidden: {
                    ...prev.hidden,
                    [category]: {
                      ...prev.hidden[category],
                      [value]: !prev.hidden[category][value]
                    }
                  }
                }));
              }}
              onResetRules={() => setNormalizationRules({
                teachers: {}, promos: {}, subjects: {},
                hidden: { teachers: {}, promos: {}, subjects: {} }
              })}
            />
          )}

          {view === 'settings' && (
            <Settings
              calendars={calendars}
              teacherOptions={teacherOptions}
              selectedTeacher={selectedTeacher}
              isMobile={isMobile}
              onSelectTeacher={setSelectedTeacher}
              onOpenFix={() => setView('fix')}
              onImport={handleImport}
              onImportFromUrl={handleImportFromUrl}
              onRemove={handleRemoveCalendar}
              onToggle={handleToggleCalendar}
              onToggleStats={handleToggleStats}
              onRenameCalendar={handleRenameCalendar}
              onRefreshCalendar={async (id) => {
                await refreshRemoteCalendar(id, true);
              }}
            />
          )}

          {view === 'search' && <SearchResults events={searchResults} query={searchQuery} isMobile={isMobile} />}
        </div>
      </main>

      <AdvancedFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={setFilters}
        currentFilters={filters}
      />

      {/* 3. Bottom Navigation Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, width: '100%',
        background: 'white', borderTop: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-around', padding: isMobile ? '0.45rem 0' : '0.8rem 0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 100
      }}>
        <NavBtn label={t.schedule} active={view === 'agenda'} onClick={() => setView('agenda')} icon="📅" compact={isMobile} />
        <NavBtn label={t.courses} active={view === 'courses'} onClick={() => setView('courses')} icon="📚" compact={isMobile} />
        <NavBtn label={t.service} active={view === 'stats'} onClick={() => setView('stats')} icon="📊" compact={isMobile} />
        {isMobile && (
          <NavBtn
            label={lang === 'fr' ? 'Recherche' : 'Search'}
            active={view === 'search'}
            onClick={() => {
              setMobileMenuOpen(false);
              setView('search');
            }}
            icon="🔎"
            compact={isMobile}
          />
        )}
        <NavBtn label={t.settings} active={view === 'settings'} onClick={() => setView('settings')} icon="⚙️" compact={isMobile} />
      </div>
    </div>
    </LangContext.Provider>
  );
}

function NavBtn({ label, active, onClick, icon, compact = false }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '4px', cursor: 'pointer',
        color: active ? 'var(--primary-color)' : '#94a3b8',
        fontWeight: active ? 600 : 400
      }}
    >
      <span style={{ fontSize: compact ? '1.02rem' : '1.2rem' }}>{icon}</span>
      <span style={{ fontSize: compact ? '0.62rem' : '0.75rem' }}>{label}</span>
    </button>
  );
}
