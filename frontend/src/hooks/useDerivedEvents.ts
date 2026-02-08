import { useCallback, useMemo } from 'react';
import type { FilterState } from '../components/AdvancedFilters';
import type { Calendar, EnrichedEvent } from '../types';
import type { NormalizationRules } from './useCalendarPersistence';

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

type UseDerivedEventsArgs = {
  calendars: Calendar[];
  normalizationRules: NormalizationRules;
  filters: FilterState;
  mainCalendarId: string | null;
  searchQuery: string;
};

export function useDerivedEvents({
  calendars,
  normalizationRules,
  filters,
  mainCalendarId,
  searchQuery,
}: UseDerivedEventsArgs) {
  const allEvents = useMemo(() => {
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

    const normalizeList = (
      values: string[] | undefined,
      map: Record<string, string>,
      hideMap: Record<string, boolean>,
    ) => Array.from(new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeValue(map, hideMap, value))
        .filter(Boolean)
    ));

    const rawEvents: Omit<EnrichedEvent, 'is_duplicate'>[] = calendars
      .flatMap((cal) => cal.events.map((ev) => {
        const startDate = parseIcsDateTime(ev.start_iso);
        const endDate = parseIcsDateTime(ev.end_iso);
        const startMs = startDate?.getTime() ?? NaN;
        const endMs = endDate?.getTime() ?? NaN;
        const computedDuration = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
          ? (endMs - startMs) / 36e5
          : 0;
        const durationHours = ev.duration_hours && ev.duration_hours > 0 ? ev.duration_hours : computedDuration;

        const teacherSource = Array.isArray(ev.teachers) && ev.teachers.length > 0
          ? ev.teachers
          : ['—'];
        const teachersNormalized = normalizeList(
          teacherSource,
          normalizationRules.teachers,
          normalizationRules.hidden.teachers,
        );
        const promosNormalized = normalizeList(
          ev.promos,
          normalizationRules.promos,
          normalizationRules.hidden.promos,
        );
        const subjectNormalized = normalizeValue(
          normalizationRules.subjects,
          normalizationRules.hidden.subjects,
          ev.subject || '',
        );

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
          subject: subjectNormalized,
          teachers: teachersNormalized,
          promos: promosNormalized,
          extractedTeacher: teachersNormalized.join(', '),
          promo: promosNormalized.join(', '),
        };
      }));

    const seen = new Set<string>();
    return rawEvents.map((ev): EnrichedEvent => {
      if (!ev.stats_included) return { ...ev, is_duplicate: false };
      const key = `${ev.start_iso}|${ev.end_iso}|${ev.subject}|${ev.type_}|${ev.extractedTeacher}`;
      if (seen.has(key)) {
        return { ...ev, is_duplicate: true };
      }
      seen.add(key);
      return { ...ev, is_duplicate: false };
    });
  }, [calendars, normalizationRules]);

  const serviceEvents = useMemo(() => {
    return allEvents.filter((ev) => ev.stats_included !== false);
  }, [allEvents]);

  const teacherOptions = useMemo(() => {
    const counts = new Map<string, number>();
    serviceEvents.forEach((ev) => {
      const teacherStr = (ev.extractedTeacher || '').trim();
      teacherStr
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t && t !== '—' && t.toLowerCase() !== 'unknown teacher')
        .forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [serviceEvents]);

  const applyFilters = useCallback((sourceOverride?: FilterState['source']) => {
    let result = allEvents;
    const source = sourceOverride ?? filters.source;

    switch (source) {
      case 'service':
        result = result.filter((ev) => ev.stats_included !== false);
        break;
      case 'main':
        result = mainCalendarId ? result.filter((ev) => ev.calendarId === mainCalendarId) : [];
        break;
      case 'visible':
        result = result.filter((ev) => ev.isVisible);
        break;
      case 'all':
      default:
        break;
    }

    if (filters.dateStart) {
      result = result.filter((ev) => {
        const d = ev.start_date;
        if (!d) return false;
        return toLocalDateKey(d) >= filters.dateStart;
      });
    }
    if (filters.dateEnd) {
      result = result.filter((ev) => {
        const d = ev.start_date;
        if (!d) return false;
        return toLocalDateKey(d) <= filters.dateEnd;
      });
    }

    const startMin = filters.startTime ? parseTimeToMinutes(filters.startTime) : null;
    const endMin = filters.endTime ? parseTimeToMinutes(filters.endTime) : null;
    if (startMin !== null || endMin !== null) {
      result = result.filter((ev) => {
        const startDate = ev.start_date;
        const endDate = ev.end_date;
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

    if (filters.days.length > 0) {
      result = result.filter((ev) => {
        const date = ev.start_date;
        if (!date) return false;
        let day = date.getDay(); // 0=Sun, 1=Mon
        if (day === 0) day = 7; // Normalize to 1=Mon, 7=Sun
        return filters.days.includes(day);
      });
    }

    return result;
  }, [allEvents, filters, mainCalendarId]);

  const filteredEvents = useMemo(() => applyFilters(), [applyFilters]);
  const courseEvents = useMemo(() => applyFilters('all'), [applyFilters]);
  const scheduleEvents = useMemo(() => applyFilters('visible'), [applyFilters]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const term = searchQuery.toLowerCase();
    return filteredEvents.filter((ev) =>
      (ev.subject && ev.subject.toLowerCase().includes(term)) ||
      (ev.type_ && ev.type_.toLowerCase().includes(term)) ||
      ((ev.extractedTeacher || '').toLowerCase().includes(term))
    );
  }, [filteredEvents, searchQuery]);

  return {
    allEvents,
    serviceEvents,
    teacherOptions,
    courseEvents,
    scheduleEvents,
    searchResults,
  };
}
