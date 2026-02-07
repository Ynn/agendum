import { useState, useMemo, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { NormalizedEvent } from '../types';
import frLocale from '@fullcalendar/core/locales/fr';
import { useLang, useT } from '../i18n';
import { getSubjectColor, getSubjectColorLight } from '../utils/colors';

interface Props {
    events: NormalizedEvent[];
    isMobile?: boolean;
    isTablet?: boolean;
    selectedSubject: string;
    onSubjectChange: (subject: string) => void;
}

export function CourseExplorer({
    events,
    isMobile = false,
    isTablet = false,
    selectedSubject,
    onSubjectChange
}: Props) {
    const [subjectFilter, setSubjectFilter] = useState('');
    const [selectedCalendarId, setSelectedCalendarId] = useState('');
    const [tab, setTab] = useState<'list' | 'calendar' | 'teachers' | 'promos' | 'rooms'>('list');
    const [mobileCalendarView, setMobileCalendarView] = useState<'timeGridWeek' | 'dayGridMonth' | 'listWeek'>('timeGridWeek');
    const [breakdownScope, setBreakdownScope] = useState<'total' | 'done' | 'todo'>('total');
    const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
    const [nowTs, setNowTs] = useState(() => Date.now());
    const lang = useLang();
    const t = useT();
    const mobileCalendarRef = useRef<FullCalendar | null>(null);
    const mobileSwipeRef = useRef<{ x: number; y: number } | null>(null);

    const calendarOptions = useMemo(() => {
        const map = new Map<string, string>();
        events.forEach(ev => {
            const id = (ev as any).calendarId as string | undefined;
            const name = (ev as any).calendarName as string | undefined;
            if (!id || !name) return;
            if (!map.has(id)) map.set(id, name);
        });
        const locale = lang === 'fr' ? 'fr' : 'en';
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], locale));
    }, [events, lang]);

    useEffect(() => {
        if (!selectedCalendarId) return;
        const stillExists = calendarOptions.some(([id]) => id === selectedCalendarId);
        if (!stillExists) setSelectedCalendarId('');
    }, [calendarOptions, selectedCalendarId]);

    const filteredEvents = useMemo(() => {
        if (!selectedCalendarId) return events;
        return events.filter(ev => (ev as any).calendarId === selectedCalendarId);
    }, [events, selectedCalendarId]);

    // 1. Extract unique subjects and apply filter
    const subjects = useMemo(() => {
        const set = new Set<string>();
        filteredEvents.forEach(ev => {
            if (ev.subject && ev.subject.length > 2) set.add(ev.subject);
        });
        const all = Array.from(set).sort();
        if (!subjectFilter) return all;
        const term = subjectFilter.toLowerCase();
        return all.filter(s => s.toLowerCase().includes(term));
    }, [filteredEvents, subjectFilter]);

    useEffect(() => {
        if (!selectedSubject) return;
        if (!subjects.includes(selectedSubject)) onSubjectChange('');
    }, [subjects, selectedSubject, onSubjectChange]);

    useEffect(() => {
        if (!selectedSubject) return;
        setTab('list');
        setBreakdownScope('total');
    }, [selectedSubject]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const id = window.setInterval(() => setNowTs(Date.now()), 60000);
        return () => window.clearInterval(id);
    }, []);

    // 2. Filter events for selected subject
    const courseEvents = useMemo(() => {
        if (!selectedSubject) return [];

        const subjectEvents = filteredEvents
            .filter(ev => ev.subject === selectedSubject)
            .sort((a, b) => {
                const aTs = (a as any).start_ts ?? 0;
                const bTs = (b as any).start_ts ?? 0;
                return aTs - bTs;
            });

        const addPromos = (set: Set<string>, value?: string) => {
            if (!value) return;
            value
                .split(',')
                .map(v => v.trim())
                .filter(Boolean)
                .forEach(v => set.add(v));
        };

        // Merge mutualized duplicates: same teacher, time, and type should appear once
        // but keep all promos (comma-separated)
        const merged = new Map<string, { base: NormalizedEvent; promos: Set<string> }>();

        subjectEvents.forEach(ev => {
            const key = `${ev.start_iso}|${ev.end_iso}|${ev.type_}|${(ev as any).extractedTeacher || ''}`;
            let entry = merged.get(key);
            if (!entry) {
                entry = { base: ev, promos: new Set<string>() };
                merged.set(key, entry);
            }
            addPromos(entry.promos, (ev as any).promo || '');
        });

        return Array.from(merged.values())
            .map(({ base, promos }) => ({
                ...base,
                promo: Array.from(promos).join(', ')
            }))
            .sort((a, b) => {
                const aTs = (a as any).start_ts ?? 0;
                const bTs = (b as any).start_ts ?? 0;
                return aTs - bTs;
            });
    }, [selectedSubject, filteredEvents]);

    const formatDate = (d?: Date) => {
        if (!d) return '—';
        return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
    };
    const dayShort = lang === 'fr'
        ? ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']
        : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const formatDateWithDay = (d?: Date) => {
        if (!d) return '—';
        const day = dayShort[d.getDay()] ?? '';
        return `${day} ${formatDate(d)}`;
    };

    const formatTime = (d?: Date) => {
        if (!d) return '—';
        return d.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const splitTeachers = (value?: string) => {
        if (!value) return [];
        return value
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
    };

    const splitPromos = (value?: string) => {
        if (!value) return [];
        return value
            .split(',')
            .map(p => p.trim())
            .filter(Boolean);
    };

    const rawEventLabel = lang === 'fr' ? "Voir l'événement brut" : 'View raw event';
    const calendarViewOptions = [
        { value: 'timeGridWeek', label: t.calendar_view_week },
        { value: 'dayGridMonth', label: t.calendar_view_month },
        { value: 'listWeek', label: t.calendar_view_planning }
    ];
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const dayLetters = lang === 'fr'
        ? ['D', 'L', 'M', 'M', 'J', 'V', 'S']
        : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const isEventInScope = (ev: NormalizedEvent, scope: 'total' | 'done' | 'todo') => {
        if (scope === 'total') return true;
        const start = (ev as any).start_date as Date | undefined;
        const end = (ev as any).end_date as Date | undefined;
        const startMs = start?.getTime();
        const endMs = end?.getTime();

        if (typeof endMs === 'number' && Number.isFinite(endMs)) {
            return scope === 'done' ? endMs <= nowTs : endMs > nowTs;
        }
        if (typeof startMs === 'number' && Number.isFinite(startMs)) {
            return scope === 'done' ? startMs <= nowTs : startMs > nowTs;
        }
        return false;
    };
    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    const mixRgb = (
        from: [number, number, number],
        to: [number, number, number],
        t: number
    ): [number, number, number] => [
        lerp(from[0], to[0], t),
        lerp(from[1], to[1], t),
        lerp(from[2], to[2], t)
    ];
    const getTimeAccentColor = (start?: Date) => {
        if (!start) return '#94a3b8';
        const hour = start.getHours() + (start.getMinutes() / 60);
        const morning = hour < 12;

        const ratio = morning
            ? (hour < 10 ? 0 : Math.min(1, (hour - 10) / 2))
            : Math.min(1, Math.max(0, (hour - 12) / 6));

        const indicatorRgb = morning
            ? mixRgb([34, 197, 94], [22, 163, 74], ratio)
            : mixRgb([217, 119, 6], [146, 64, 14], ratio);

        return `rgb(${indicatorRgb[0]}, ${indicatorRgb[1]}, ${indicatorRgb[2]})`;
    };
    const getListBorderColor = (ev: NormalizedEvent, defaultColor: string) => {
        const start = (ev as any).start_date as Date | undefined;
        const end = (ev as any).end_date as Date | undefined;
        if (!start || !end) return defaultColor;

        const startMs = start.getTime();
        const endMs = end.getTime();
        if (endMs <= nowTs) return '#9ca3af'; // past
        if (startMs <= nowTs && nowTs < endMs) return '#dc2626'; // ongoing

        const now = new Date(nowTs);
        const sameDay = start.getFullYear() === now.getFullYear()
            && start.getMonth() === now.getMonth()
            && start.getDate() === now.getDate();
        if (sameDay) return '#f59e0b'; // today

        return defaultColor; // future
    };

    const renderEventModal = () => {
        if (!selectedEvent) return null;
        const start = (selectedEvent as any).start_date as Date | undefined;
        const end = (selectedEvent as any).end_date as Date | undefined;
        const title = selectedEvent.raw.summary?.trim() ||
            `${selectedEvent.type_} ${selectedEvent.subject || ''}`.trim() ||
            t.unknown;

        return (
            <div className="event-modal-overlay">
                <div className="event-modal-backdrop" onClick={() => setSelectedEvent(null)} />
                <div className="card event-modal">
                    <div className="event-modal-header">
                        <div style={{ fontWeight: 700 }}>{title}</div>
                        <button className="btn" onClick={() => setSelectedEvent(null)} style={{ padding: '0.2rem 0.6rem' }}>×</button>
                    </div>
                    <div className="event-modal-grid">
                        <div><strong>{t.time}:</strong> {formatDateWithDay(start)} • {formatTime(start)} - {formatTime(end)}</div>
                        <div><strong>{t.location}:</strong> {selectedEvent.raw.location || '—'}</div>
                        <div><strong>{t.duration}:</strong> {selectedEvent.duration_hours}h</div>
                    </div>
                    <div style={{ marginTop: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {selectedEvent.raw.description || '—'}
                    </div>
                </div>
            </div>
        );
    };

    const scopedCourseEvents = useMemo(() => {
        if (breakdownScope === 'total') return courseEvents;
        return courseEvents.filter(ev => isEventInScope(ev, breakdownScope));
    }, [courseEvents, breakdownScope, nowTs]);

    type Totals = {
        cm: number;
        td: number;
        tp: number;
        project: number;
        exam: number;
        other: number;
        total: number;
    };

    const makeTotals = (): Totals => ({
        cm: 0,
        td: 0,
        tp: 0,
        project: 0,
        exam: 0,
        other: 0,
        total: 0
    });

    const getBucket = (typeRaw: string): 'cm' | 'td' | 'tp' | 'project' | 'exam' | 'other' => {
        const type = typeRaw.toUpperCase();
        if (type.includes('CM')) return 'cm';
        if (type.includes('TD')) return 'td';
        if (type.includes('TP')) return 'tp';
        if (type.includes('PROJET') || type.includes('PROJECT')) return 'project';
        if (type.includes('EXAM') || type.includes('DS') || type.includes('CC') || type.includes('CT')) return 'exam';
        return 'other';
    };

    const addDuration = (entry: Totals, bucket: ReturnType<typeof getBucket>, dur: number) => {
        if (bucket === 'cm') entry.cm += dur;
        else if (bucket === 'td') entry.td += dur;
        else if (bucket === 'tp') entry.tp += dur;
        else if (bucket === 'project') entry.project += dur;
        else if (bucket === 'exam') entry.exam += dur;
        else entry.other += dur;

        if (bucket === 'cm' || bucket === 'td' || bucket === 'tp' || bucket === 'project') {
            entry.total += dur;
        }
    };

    const summary = useMemo(() => {
        const totals = makeTotals();
        scopedCourseEvents.forEach(ev => {
            const dur = ev.duration_hours || 0;
            const bucket = getBucket(ev.type_ || '');
            addDuration(totals, bucket, dur);
        });
        return totals;
    }, [scopedCourseEvents]);

    const activeBreakdown = useMemo(() => {
        if (tab !== 'teachers' && tab !== 'promos' && tab !== 'rooms') return [] as Array<[string, Totals]>;

        const map = new Map<string, Totals>();
        const addForKey = (key: string, bucket: ReturnType<typeof getBucket>, dur: number) => {
            if (!map.has(key)) map.set(key, makeTotals());
            addDuration(map.get(key)!, bucket, dur);
        };

        scopedCourseEvents.forEach(ev => {
            const dur = ev.duration_hours || 0;
            const bucket = getBucket(ev.type_ || '');
            if (tab === 'teachers') {
                const teacherNames = splitTeachers((ev as any).extractedTeacher);
                const targets = teacherNames.length > 0 ? teacherNames : [t.unknown];
                targets.forEach(name => addForKey(name, bucket, dur));
                return;
            }
            if (tab === 'promos') {
                const promoNames = splitPromos((ev as any).promo);
                const targets = promoNames.length > 0 ? promoNames : [t.unknown];
                targets.forEach(name => addForKey(name, bucket, dur));
                return;
            }
            addForKey(ev.raw.location?.trim() || t.unknown, bucket, dur);
        });

        return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
    }, [scopedCourseEvents, tab, t.unknown]);

    // Get color for selected subject
    const subjectColors = selectedSubject ? getSubjectColor(selectedSubject) : null;

    // Calendar Events Format
    const calendarEvents = useMemo(() => {
        const colors = subjectColors ?? getSubjectColor(selectedSubject);
        return scopedCourseEvents.map(ev => {
            return {
                title: `${ev.type_} - ${ev.raw.location || ''}`,
                start: ev.start_iso,
                end: ev.end_iso,
                backgroundColor: colors.bg,
                borderColor: colors.bg,
                textColor: colors.text,
                extendedProps: {
                    location: ev.raw.location,
                    description: ev.raw.description
                }
            };
        });
    }, [scopedCourseEvents, selectedSubject, subjectColors]);

    if (isMobile) {
        return (
            <>
            <div className="course-mobile fade-in page-scroll" style={{ height: '100%', minHeight: 0, overflowY: 'auto', padding: '0.35rem 0.2rem 0.6rem' }}>
                {!selectedSubject ? (
                    <div className="card" style={{ padding: '0.7rem', minHeight: 0 }}>
                        <h3 style={{
                            marginTop: 0,
                            marginBottom: '0.6rem',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                        }}>
                            <span>📚</span> {t.subjects}
                        </h3>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            {t.calendar_filter_label}
                        </label>
                        <select
                            value={selectedCalendarId}
                            onChange={(e) => setSelectedCalendarId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.45rem',
                                marginBottom: '0.6rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--card-bg)',
                                color: 'var(--text-color)',
                                fontSize: '0.8rem'
                            }}
                        >
                            <option value="">{t.calendar_filter_all}</option>
                            {calendarOptions.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder={`🔍 ${t.filter_subjects}`}
                            style={{
                                padding: '0.55rem',
                                marginBottom: '0.6rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border-color)',
                                width: '100%',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                        />
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            {subjects.length} {subjects.length === 1 ? t.subject_count_singular : t.subject_count_plural}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {subjects.map(s => {
                                const colors = getSubjectColor(s);
                                return (
                                    <button
                                        key={s}
                                        className="btn"
                                        onClick={() => {
                                            onSubjectChange(s);
                                            setTab('list');
                                        }}
                                        style={{
                                            justifyContent: 'flex-start',
                                            fontSize: '0.82rem',
                                            padding: '0.45rem 0.6rem',
                                            borderLeft: `4px solid ${colors.bg}`,
                                            background: 'var(--card-bg)'
                                        }}
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: '0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            padding: '0.65rem 0.7rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: subjectColors ? getSubjectColorLight(selectedSubject) : 'var(--bg-color)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem' }}>
                                <button
                                    className="btn"
                                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', fontWeight: 600 }}
                                    onClick={() => onSubjectChange('')}
                                >
                                    ← {t.back}
                                </button>
                                <h2 style={{
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    fontSize: '1rem',
                                    fontWeight: 700
                                }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '6px',
                                        height: '20px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: subjectColors?.bg || 'var(--primary-color)'
                                    }}></span>
                                    {selectedSubject}
                                </h2>
                            </div>

                            <div className="tabs" style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.45rem' }}>
                                <button className={`btn ${tab === 'list' ? 'btn-primary' : ''}`} onClick={() => setTab('list')} style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}>
                                    📋 {t.list}
                                </button>
                                <button className={`btn ${tab === 'calendar' ? 'btn-primary' : ''}`} onClick={() => setTab('calendar')} style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}>
                                    📅 {t.calendar}
                                </button>
                                <button className={`btn ${tab === 'teachers' ? 'btn-primary' : ''}`} onClick={() => setTab('teachers')} style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}>
                                    👥 {t.by_teacher_short}
                                </button>
                                <button className={`btn ${tab === 'promos' ? 'btn-primary' : ''}`} onClick={() => setTab('promos')} style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}>
                                    🎓 {t.by_promo_short}
                                </button>
                                <button className={`btn ${tab === 'rooms' ? 'btn-primary' : ''}`} onClick={() => setTab('rooms')} style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}>
                                    🏫 {t.by_room_short}
                                </button>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '0.8rem',
                                flexWrap: 'wrap',
                                padding: '0.45rem 0.55rem',
                                background: 'var(--card-bg)',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-xs)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>⏱️</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_label}</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-color)' }}>{summary.total.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>📖</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e40af' }}>{summary.cm.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>✏️</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#166534' }}>{summary.td.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🔬</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#374151' }}>{summary.tp.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🧩</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#7c3aed' }}>{summary.project.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        flexWrap: 'wrap',
                                        marginLeft: 0,
                                        width: '100%',
                                        flexBasis: '100%'
                                    }}
                                >
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t.service_period_label}</span>
                                    {([
                                        { key: 'total', label: t.service_period_total },
                                        { key: 'done', label: t.service_period_done },
                                        { key: 'todo', label: t.service_period_todo }
                                    ] as const).map(opt => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            className={`btn ${breakdownScope === opt.key ? 'btn-primary' : ''}`}
                                            onClick={() => setBreakdownScope(opt.key)}
                                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '0.45rem', minHeight: 0 }}>
                            {tab === 'list' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {scopedCourseEvents.map((ev, i) => {
                                        const promoText = ((ev as any).promo || '—') as string;
                                        const borderColor = getListBorderColor(ev, subjectColors?.bg || 'var(--primary-color)');
                                        const timeAccentColor = getTimeAccentColor((ev as any).start_date);
                                        return (
                                            <div key={i} className="card" style={{ padding: '0.5rem', borderLeft: `4px solid ${borderColor}` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', minWidth: 0, flex: 1 }}>
                                                            <strong style={{ fontSize: '0.82rem', flexShrink: 0 }}>{ev.type_}</strong>
                                                            <span
                                                                title={promoText}
                                                                style={{
                                                                    fontSize: '0.74rem',
                                                                    color: 'var(--text-muted)',
                                                                    fontWeight: 400,
                                                                    minWidth: 0,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {promoText}
                                                            </span>
                                                        </div>
                                                        <button
                                                            className="btn"
                                                            title={rawEventLabel}
                                                            aria-label={rawEventLabel}
                                                            onClick={() => setSelectedEvent(ev)}
                                                            style={{
                                                                padding: '0.1rem 0.35rem',
                                                                fontSize: '0.7rem',
                                                                lineHeight: 1,
                                                                borderRadius: '999px',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            ⓘ
                                                        </button>
                                                    </div>
                                                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', flexShrink: 0 }}>{ev.duration_hours}h</span>
                                                </div>
                                                <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                                                    {formatDateWithDay((ev as any).start_date)} •
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.35rem' }}>
                                                        <span
                                                            aria-hidden
                                                            style={{
                                                                width: '0.5rem',
                                                                height: '0.5rem',
                                                                borderRadius: '2px',
                                                                background: timeAccentColor,
                                                                display: 'inline-block',
                                                                flexShrink: 0
                                                            }}
                                                        />
                                                        <span>
                                                            {formatTime((ev as any).start_date)}-{formatTime((ev as any).end_date)}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.76rem', marginTop: '0.18rem' }}>{splitTeachers((ev as any).extractedTeacher).join(', ') || '—'}</div>
                                                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{ev.raw.location || '—'}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {tab === 'calendar' && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            {t.calendar_view_label}
                                        </label>
                                        <select
                                            value={mobileCalendarView}
                                            onChange={(e) => setMobileCalendarView(e.target.value as typeof mobileCalendarView)}
                                            style={{
                                                padding: '0.35rem 0.5rem',
                                                borderRadius: 'var(--radius)',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--card-bg)',
                                                color: 'var(--text-color)',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            {calendarViewOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div
                                        style={{ height: '66vh', minHeight: 380 }}
                                        onTouchStart={(e) => {
                                            if (!isMobile || e.touches.length !== 1) return;
                                            const t = e.touches[0];
                                            mobileSwipeRef.current = { x: t.clientX, y: t.clientY };
                                        }}
                                        onTouchEnd={(e) => {
                                            if (!isMobile || !mobileSwipeRef.current || e.changedTouches.length !== 1) return;
                                            const t = e.changedTouches[0];
                                            const dx = t.clientX - mobileSwipeRef.current.x;
                                            const dy = t.clientY - mobileSwipeRef.current.y;
                                            mobileSwipeRef.current = null;
                                            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
                                            const api = mobileCalendarRef.current?.getApi();
                                            if (!api) return;
                                            if (dx < 0) api.next();
                                            else api.prev();
                                        }}
                                    >
                                    <FullCalendar
                                        ref={mobileCalendarRef}
                                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                                        initialView={mobileCalendarView}
                                        key={mobileCalendarView}
                                        stickyHeaderDates={false}
                                        headerToolbar={{
                                            left: 'prev,next',
                                            center: 'title',
                                            right: ''
                                        }}
                                        events={calendarEvents}
                                        locale={lang === 'fr' ? frLocale : undefined}
                                        firstDay={1}
                                        dayHeaderContent={(arg) => {
                                            if (arg.view.type.includes('list')) return undefined;
                                            const letter = dayLetters[arg.date.getDay()] || '';
                                            const dayNum = pad2(arg.date.getDate());
                                            return `${letter} ${dayNum}`;
                                        }}
                                        height="100%"
                                    />
                                    </div>
                                </div>
                            )}

                            {tab === 'teachers' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {activeBreakdown.map(([name, s]) => (
                                        <div key={name} className="card" style={{ padding: '0.45rem 0.55rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: '0.25rem' }}>{name}</div>
                                            <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                                                CM {s.cm.toFixed(1)}h • TD {s.td.toFixed(1)}h • TP {s.tp.toFixed(1)}h • {t.project} {s.project.toFixed(1)}h • {t.total} {s.total.toFixed(1)}h • {t.exam} {s.exam.toFixed(1)}h • {t.other} {s.other.toFixed(1)}h
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {tab === 'promos' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {activeBreakdown.map(([name, s]) => (
                                        <div key={name} className="card" style={{ padding: '0.45rem 0.55rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: '0.25rem' }}>{name}</div>
                                            <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                                                CM {s.cm.toFixed(1)}h • TD {s.td.toFixed(1)}h • TP {s.tp.toFixed(1)}h • {t.project} {s.project.toFixed(1)}h • {t.total} {s.total.toFixed(1)}h • {t.exam} {s.exam.toFixed(1)}h • {t.other} {s.other.toFixed(1)}h
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {tab === 'rooms' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {activeBreakdown.map(([name, s]) => (
                                        <div key={name} className="card" style={{ padding: '0.45rem 0.55rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: '0.25rem' }}>{name}</div>
                                            <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                                                CM {s.cm.toFixed(1)}h • TD {s.td.toFixed(1)}h • TP {s.tp.toFixed(1)}h • {t.project} {s.project.toFixed(1)}h • {t.total} {s.total.toFixed(1)}h • {t.exam} {s.exam.toFixed(1)}h • {t.other} {s.other.toFixed(1)}h
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {renderEventModal()}
            </>
        );
    }

    return (
        <div className="course-explorer fade-in full-height-view" style={{ display: 'flex', minHeight: 0, gap: isTablet ? '0.6rem' : '1rem', height: '100%' }}>

            {/* Sidebar: Subject List - LEFT SIDE */}
            <div className="card" style={{
                width: isTablet ? '248px' : '320px',
                display: 'flex',
                flexDirection: 'column',
                padding: isTablet ? '0.7rem' : '1rem',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)'
            }}>
                <h3 style={{
                    marginTop: 0,
                    marginBottom: isTablet ? '0.65rem' : '1rem',
                    fontSize: isTablet ? '0.92rem' : '1.1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span>📚</span> {t.subjects}
                </h3>
                <label style={{ display: 'block', fontSize: isTablet ? '0.7rem' : '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    {t.calendar_filter_label}
                </label>
                <select
                    value={selectedCalendarId}
                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                    style={{
                        width: '100%',
                        padding: isTablet ? '0.5rem' : '0.65rem',
                        marginBottom: isTablet ? '0.6rem' : '0.85rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-color)',
                        fontSize: isTablet ? '0.78rem' : '0.85rem'
                    }}
                >
                    <option value="">{t.calendar_filter_all}</option>
                    {calendarOptions.map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder={`🔍 ${t.filter_subjects}`}
                    style={{
                        padding: isTablet ? '0.52rem' : '0.75rem',
                        marginBottom: isTablet ? '0.7rem' : '1rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border-color)',
                        width: '100%',
                        fontSize: isTablet ? '0.8rem' : '0.9rem',
                        transition: 'all var(--transition-base)',
                        outline: 'none'
                    }}
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-focus)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                />
                <div style={{
                    fontSize: isTablet ? '0.66rem' : '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: isTablet ? '0.5rem' : '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600
                }}>
                    {subjects.length} {subjects.length === 1 ? 'matière' : 'matières'}
                </div>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isTablet ? '0.36rem' : '0.5rem',
                    minHeight: 0,
                    paddingRight: '0.25rem'
                }}>
                    {subjects.map(s => {
                        const colors = getSubjectColor(s);
                        const isSelected = selectedSubject === s;
                        return (
                            <div
                                key={s}
                                onClick={() => onSubjectChange(s)}
                                style={{
                                    padding: isTablet ? '0.55rem' : '0.75rem',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius)',
                                    background: isSelected ? colors.bg : 'transparent',
                                    color: isSelected ? colors.text : 'var(--text-color)',
                                    fontWeight: isSelected ? 600 : 500,
                                    fontSize: isTablet ? '0.78rem' : '0.9rem',
                                    transition: 'all var(--transition-base)',
                                    border: `2px solid ${isSelected ? colors.bg : 'transparent'}`,
                                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                                    transform: isSelected ? 'translateX(4px)' : 'none',
                                    position: 'relative',
                                    paddingLeft: '1rem'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = getSubjectColorLight(s);
                                        e.currentTarget.style.borderColor = colors.bg;
                                        e.currentTarget.style.transform = 'translateX(2px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = 'transparent';
                                        e.currentTarget.style.transform = 'none';
                                    }
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    left: '0.25rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '4px',
                                    height: isSelected ? '60%' : '0%',
                                    background: isSelected ? colors.text : colors.bg,
                                    borderRadius: 'var(--radius-full)',
                                    transition: 'height var(--transition-base)'
                                }}></div>
                                {s}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content - RIGHT SIDE */}
            <div className="card" style={{ flex: 1, padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                {!selectedSubject ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: 'var(--text-light)',
                        flexDirection: 'column',
                        gap: '1rem',
                        padding: '2rem'
                    }}>
                        <div style={{ fontSize: '3rem', opacity: 0.5 }}>📚</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{t.select_subject_hint}</div>
                    </div>
                ) : (
                    <>
                        {/* Header & Stats Header */}
                        <div style={{
                            padding: isTablet ? '0.55rem 0.65rem' : '0.7rem 0.9rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: subjectColors ? getSubjectColorLight(selectedSubject) : 'var(--bg-color)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isTablet ? '0.35rem' : '0.5rem', flexWrap: 'wrap', gap: isTablet ? '0.35rem' : '0.5rem' }}>
                                <h2 style={{
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    fontSize: isTablet ? '0.94rem' : '1.05rem',
                                    fontWeight: 700
                                }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '6px',
                                        height: isTablet ? '17px' : '20px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: subjectColors?.bg || 'var(--primary-color)'
                                    }}></span>
                                    {selectedSubject}
                                </h2>
                                <div className="tabs" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className={`btn ${tab === 'list' ? 'btn-primary' : ''}`} onClick={() => setTab('list')} style={{ fontSize: isTablet ? '0.68rem' : '0.75rem', padding: isTablet ? '0.17rem 0.34rem' : '0.2rem 0.45rem' }}>
                                        📋 {t.list}
                                    </button>
                                    <button className={`btn ${tab === 'calendar' ? 'btn-primary' : ''}`} onClick={() => setTab('calendar')} style={{ fontSize: isTablet ? '0.68rem' : '0.75rem', padding: isTablet ? '0.17rem 0.34rem' : '0.2rem 0.45rem' }}>
                                        📅 {t.calendar}
                                    </button>
                                    <button className={`btn ${tab === 'teachers' ? 'btn-primary' : ''}`} onClick={() => setTab('teachers')} style={{ fontSize: isTablet ? '0.68rem' : '0.75rem', padding: isTablet ? '0.17rem 0.34rem' : '0.2rem 0.45rem' }}>
                                        👥 {t.by_teacher}
                                    </button>
                                    <button className={`btn ${tab === 'promos' ? 'btn-primary' : ''}`} onClick={() => setTab('promos')} style={{ fontSize: isTablet ? '0.68rem' : '0.75rem', padding: isTablet ? '0.17rem 0.34rem' : '0.2rem 0.45rem' }}>
                                        🎓 {t.by_promo}
                                    </button>
                                    <button className={`btn ${tab === 'rooms' ? 'btn-primary' : ''}`} onClick={() => setTab('rooms')} style={{ fontSize: isTablet ? '0.68rem' : '0.75rem', padding: isTablet ? '0.17rem 0.34rem' : '0.2rem 0.45rem' }}>
                                        🏫 {t.by_room}
                                    </button>
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '0.9rem',
                                flexWrap: 'wrap',
                                padding: '0.45rem 0.6rem',
                                background: 'var(--card-bg)',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-xs)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>⏱️</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_label}</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)' }}>{summary.total.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>📖</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>{summary.cm.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>✏️</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>{summary.td.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🔬</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>{summary.tp.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🧩</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7c3aed' }}>{summary.project.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.45rem',
                                        flexWrap: 'wrap',
                                        marginLeft: 'auto'
                                    }}
                                >
                                    <span style={{ fontSize: isTablet ? '0.66rem' : '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t.service_period_label}</span>
                                    {([
                                        { key: 'total', label: t.service_period_total },
                                        { key: 'done', label: t.service_period_done },
                                        { key: 'todo', label: t.service_period_todo }
                                    ] as const).map(opt => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            className={`btn ${breakdownScope === opt.key ? 'btn-primary' : ''}`}
                                            onClick={() => setBreakdownScope(opt.key)}
                                            style={{ fontSize: isTablet ? '0.66rem' : '0.72rem', padding: isTablet ? '0.16rem 0.34rem' : '0.2rem 0.42rem' }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div style={{ flex: 1, overflowY: tab === 'calendar' ? 'hidden' : 'auto', padding: '0.5rem', minHeight: 0 }}>

                            {tab === 'list' && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 10 }}>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.type}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.date}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.time}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.teacher}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.promo}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.location}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.duration}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {scopedCourseEvents.map((ev, i) => {
                                                const borderColor = getListBorderColor(ev, subjectColors?.bg || 'var(--primary-color)');
                                                const timeAccentColor = getTimeAccentColor((ev as any).start_date);
                                                return (
                                                <tr key={i} style={{
                                                    borderBottom: '1px solid var(--border-color)',
                                                    transition: 'background var(--transition-fast)'
                                                }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '0.75rem', borderLeft: `4px solid ${borderColor}` }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span style={{
                                                                padding: '4px 12px',
                                                                borderRadius: 'var(--radius-full)',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600,
                                                                background: ev.type_.toUpperCase().includes('CM') ? '#dbeafe' :
                                                                    ev.type_.toUpperCase().includes('TD') ? '#dcfce7' :
                                                                        ev.type_.toUpperCase().includes('TP') ? '#fef3c7' : '#f3f4f6',
                                                                color: ev.type_.toUpperCase().includes('CM') ? '#1e40af' :
                                                                    ev.type_.toUpperCase().includes('TD') ? '#166534' :
                                                                        ev.type_.toUpperCase().includes('TP') ? '#92400e' : '#374151',
                                                                display: 'inline-block'
                                                            }}>
                                                                {ev.type_}
                                                            </span>
                                                            <button
                                                                className="btn"
                                                                title={rawEventLabel}
                                                                aria-label={rawEventLabel}
                                                                onClick={() => setSelectedEvent(ev)}
                                                                style={{
                                                                    padding: '0.12rem 0.35rem',
                                                                    fontSize: '0.7rem',
                                                                    lineHeight: 1,
                                                                    borderRadius: '999px'
                                                                }}
                                                            >
                                                                ⓘ
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{formatDateWithDay((ev as any).start_date)}</td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span
                                                                aria-hidden
                                                                style={{
                                                                    width: '0.55rem',
                                                                    height: '0.55rem',
                                                                    borderRadius: '2px',
                                                                    background: timeAccentColor,
                                                                    display: 'inline-block',
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                            <span>
                                                                {formatTime((ev as any).start_date)} - {formatTime((ev as any).end_date)}
                                                            </span>
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 600 }}>
                                                        {splitTeachers((ev as any).extractedTeacher).join(', ') || '—'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {(() => {
                                                            const promoText = (ev as any).promo || '—';
                                                            return (
                                                                <div
                                                                    title={promoText}
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        width: '220px',
                                                                        minWidth: '120px',
                                                                        maxWidth: '480px',
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        resize: 'horizontal',
                                                                        paddingRight: '0.25rem',
                                                                        verticalAlign: 'middle'
                                                                    }}
                                                                >
                                                                    {promoText}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        {ev.raw.location || '—'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{ev.duration_hours}h</td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {tab === 'calendar' && (
                                <div style={{ height: '100%', minHeight: 0 }}>
                                    <FullCalendar
                                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                                        initialView="listWeek"
                                        stickyHeaderDates={false}
                                        headerToolbar={{
                                            left: 'prev,next today',
                                            center: 'title',
                                            right: 'dayGridMonth,timeGridWeek,listWeek'
                                        }}
                                        events={calendarEvents}
                                        locale={lang === 'fr' ? frLocale : undefined}
                                        firstDay={1}
                                        dayHeaderContent={(arg) => {
                                            if (arg.view.type.includes('list')) return undefined;
                                            const letter = dayLetters[arg.date.getDay()] || '';
                                            const dayNum = pad2(arg.date.getDate());
                                            return `${letter} ${dayNum}`;
                                        }}
                                        height="100%"
                                        expandRows={true}
                                    />
                                </div>
                            )}

                            {tab === 'teachers' && (
                                <div>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.source_teacher}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.exam}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.other}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeBreakdown.map(([name, s]) => (
                                                <tr key={name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '0.8rem', fontWeight: 600, fontSize: '0.95rem' }}>{name}</td>
                                                    <td style={{ padding: '0.8rem', color: '#1e40af', fontFamily: 'var(--font-mono)' }}>{s.cm.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#166534', fontFamily: 'var(--font-mono)' }}>{s.td.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#92400e', fontFamily: 'var(--font-mono)' }}>{s.tp.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#7c3aed', fontFamily: 'var(--font-mono)' }}>{s.project.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.total.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>{s.exam.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.other.toFixed(1)}h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--info)' }}>
                                        ℹ️ {t.teacher_breakdown_note}
                                    </p>
                                </div>
                            )}

                            {tab === 'promos' && (
                                <div>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.promo}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.exam}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.other}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeBreakdown.map(([name, s]) => (
                                                <tr key={name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '0.8rem', fontWeight: 600, fontSize: '0.95rem' }}>{name}</td>
                                                    <td style={{ padding: '0.8rem', color: '#1e40af', fontFamily: 'var(--font-mono)' }}>{s.cm.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#166534', fontFamily: 'var(--font-mono)' }}>{s.td.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#92400e', fontFamily: 'var(--font-mono)' }}>{s.tp.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#7c3aed', fontFamily: 'var(--font-mono)' }}>{s.project.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.total.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>{s.exam.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.other.toFixed(1)}h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {tab === 'rooms' && (
                                <div>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.location}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.exam}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.other}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeBreakdown.map(([name, s]) => (
                                                <tr key={name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '0.8rem', fontWeight: 600, fontSize: '0.95rem' }}>{name}</td>
                                                    <td style={{ padding: '0.8rem', color: '#1e40af', fontFamily: 'var(--font-mono)' }}>{s.cm.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#166534', fontFamily: 'var(--font-mono)' }}>{s.td.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#92400e', fontFamily: 'var(--font-mono)' }}>{s.tp.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#7c3aed', fontFamily: 'var(--font-mono)' }}>{s.project.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.total.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>{s.exam.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.other.toFixed(1)}h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </div>
                    </>
                )}
            </div>
            {renderEventModal()}
        </div>
    );
}
