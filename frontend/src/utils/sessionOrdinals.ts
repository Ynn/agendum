import type { EnrichedEvent } from '../types';

export type CoreSessionType = 'CM' | 'TD' | 'TP';

export interface SessionOrdinalInfo {
  type: CoreSessionType;
  ordinal: number;
}

const normalizeText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const normalizePromoTokens = (event: EnrichedEvent) => {
  const tokens = new Set<string>();

  for (const value of event.promos || []) {
    const normalized = normalizeText(value || '');
    if (normalized) tokens.add(normalized);
  }

  const promoInline = (event.promo || '')
    .split(',')
    .map((value) => normalizeText(value))
    .filter(Boolean);
  for (const value of promoInline) tokens.add(value);

  return Array.from(tokens).sort();
};

const getGroupKey = (event: EnrichedEvent) => {
  const promos = normalizePromoTokens(event);
  if (promos.length === 0) return '__nogroup';
  return promos.join('|');
};

const getTimestamp = (event: EnrichedEvent, bound: 'start' | 'end') => {
  const direct = bound === 'start' ? event.start_ts : event.end_ts;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
  const iso = bound === 'start' ? event.start_iso : event.end_iso;
  const parsed = Date.parse(iso);
  if (Number.isFinite(parsed)) return parsed;
  return Number.MAX_SAFE_INTEGER;
};

const getTeacherKey = (event: EnrichedEvent) => {
  if (event.extractedTeacher) return normalizeText(event.extractedTeacher);
  if (Array.isArray(event.teachers) && event.teachers.length > 0) {
    return event.teachers.map((name) => normalizeText(name)).sort().join(',');
  }
  return '';
};

const getSubjectKey = (event: EnrichedEvent) => {
  const fallback = event.raw?.summary || '';
  return normalizeText(event.subject || fallback);
};

const buildSeriesKey = (event: EnrichedEvent, type: CoreSessionType) => {
  const subjectKey = getSubjectKey(event);
  if (type === 'TD' || type === 'TP') {
    return `${subjectKey}|${type}|${getGroupKey(event)}`;
  }
  return `${subjectKey}|${type}`;
};

const buildOccurrenceKey = (event: EnrichedEvent) => {
  return [
    event.start_iso,
    event.end_iso,
    getTeacherKey(event),
    normalizeText(event.raw?.location || ''),
    normalizeText(event.raw?.summary || ''),
  ].join('|');
};

export const getCoreSessionType = (rawType: string): CoreSessionType | null => {
  const upper = (rawType || '').toUpperCase();
  if (upper.includes('CM')) return 'CM';
  if (upper.includes('TD')) return 'TD';
  if (upper.includes('TP')) return 'TP';
  return null;
};

export const formatSessionLabel = (info: SessionOrdinalInfo) => `${info.type}${info.ordinal}`;

export const computeSessionOrdinals = (events: EnrichedEvent[]) => {
  const sorted = [...events].sort((a, b) => {
    const startDiff = getTimestamp(a, 'start') - getTimestamp(b, 'start');
    if (startDiff !== 0) return startDiff;

    const endDiff = getTimestamp(a, 'end') - getTimestamp(b, 'end');
    if (endDiff !== 0) return endDiff;

    const subjectDiff = getSubjectKey(a).localeCompare(getSubjectKey(b));
    if (subjectDiff !== 0) return subjectDiff;

    const typeDiff = normalizeText(a.type_ || '').localeCompare(normalizeText(b.type_ || ''));
    if (typeDiff !== 0) return typeDiff;

    const groupDiff = getGroupKey(a).localeCompare(getGroupKey(b));
    if (groupDiff !== 0) return groupDiff;

    const teacherDiff = getTeacherKey(a).localeCompare(getTeacherKey(b));
    if (teacherDiff !== 0) return teacherDiff;

    return normalizeText(a.raw?.uid || '').localeCompare(normalizeText(b.raw?.uid || ''));
  });

  const counters = new Map<string, number>();
  const perSeriesOccurrences = new Map<string, Map<string, number>>();
  const result = new Map<EnrichedEvent, SessionOrdinalInfo | null>();

  for (const event of sorted) {
    const coreType = getCoreSessionType(event.type_ || '');
    if (!coreType) {
      result.set(event, null);
      continue;
    }

    const seriesKey = buildSeriesKey(event, coreType);
    const occurrenceKey = buildOccurrenceKey(event);
    let seriesMap = perSeriesOccurrences.get(seriesKey);
    if (!seriesMap) {
      seriesMap = new Map<string, number>();
      perSeriesOccurrences.set(seriesKey, seriesMap);
    }

    let ordinal = seriesMap.get(occurrenceKey);
    if (!ordinal) {
      ordinal = (counters.get(seriesKey) || 0) + 1;
      counters.set(seriesKey, ordinal);
      seriesMap.set(occurrenceKey, ordinal);
    }

    result.set(event, { type: coreType, ordinal });
  }

  return result;
};
