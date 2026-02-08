import { useState, useMemo, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EnrichedEvent } from '../types';
import { useLang, useT } from '../i18n';
import { getSubjectColor, getSubjectColorLight } from '../utils/colors';
import { BreakdownCards } from './course-explorer/BreakdownCards';
import { BreakdownTable } from './course-explorer/BreakdownTable';
import { CourseCalendarDesktop } from './course-explorer/CourseCalendarDesktop';
import { CourseCalendarMobile } from './course-explorer/CourseCalendarMobile';
import { CourseEventListMobile } from './course-explorer/CourseEventListMobile';
import { CourseEventModal } from './course-explorer/CourseEventModal';
import { CourseEventTableDesktop } from './course-explorer/CourseEventTableDesktop';
import { CourseTabs, type CourseTab } from './course-explorer/CourseTabs';
import { CourseSummary } from './course-explorer/CourseSummary';
import { SubjectPickerMobile } from './course-explorer/SubjectPickerMobile';
import { SubjectSidebarDesktop } from './course-explorer/SubjectSidebarDesktop';

interface Props {
    events: EnrichedEvent[];
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
    const [tab, setTab] = useState<CourseTab>('list');
    const [mobileCalendarView, setMobileCalendarView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>('timeGridWeek');
    const [breakdownScope, setBreakdownScope] = useState<'total' | 'done' | 'todo'>('total');
    const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
    const [nowTs, setNowTs] = useState(() => Date.now());
    const lang = useLang();
    const t = useT();
    const mobileCalendarRef = useRef<FullCalendar | null>(null);
    const mobileSwipeRef = useRef<{ x: number; y: number } | null>(null);

    const calendarOptions = useMemo(() => {
        const map = new Map<string, string>();
        events.forEach(ev => {
            const id = ev.calendarId;
            const name = ev.calendarName;
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
        return events.filter(ev => ev.calendarId === selectedCalendarId);
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
                const aTs = a.start_ts ?? 0;
                const bTs = b.start_ts ?? 0;
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
        const merged = new Map<string, { base: EnrichedEvent; promos: Set<string> }>();

        subjectEvents.forEach(ev => {
            const key = `${ev.start_iso}|${ev.end_iso}|${ev.type_}|${ev.extractedTeacher || ''}`;
            let entry = merged.get(key);
            if (!entry) {
                entry = { base: ev, promos: new Set<string>() };
                merged.set(key, entry);
            }
            addPromos(entry.promos, ev.promo || '');
        });

        return Array.from(merged.values())
            .map(({ base, promos }) => ({
                ...base,
                promo: Array.from(promos).join(', ')
            }))
            .sort((a, b) => {
                const aTs = a.start_ts ?? 0;
                const bTs = b.start_ts ?? 0;
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

    const splitTeachers = useCallback((value?: string) => {
        if (!value) return [];
        return value
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
    }, []);

    const splitPromos = useCallback((value?: string) => {
        if (!value) return [];
        return value
            .split(',')
            .map(p => p.trim())
            .filter(Boolean);
    }, []);

    const rawEventLabel = lang === 'fr' ? "Voir l'événement brut" : 'View raw event';
    const calendarViewOptions: Array<{ value: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'; label: string }> = [
        { value: 'timeGridDay', label: lang === 'fr' ? 'Jour' : 'Day' },
        { value: 'timeGridWeek', label: t.calendar_view_week },
        { value: 'dayGridMonth', label: t.calendar_view_month },
    ];
    const dayLetters = lang === 'fr'
        ? ['D', 'L', 'M', 'M', 'J', 'V', 'S']
        : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const isEventInScope = useCallback((ev: EnrichedEvent, scope: 'total' | 'done' | 'todo') => {
        if (scope === 'total') return true;
        const start = ev.start_date;
        const end = ev.end_date;
        const startMs = start?.getTime();
        const endMs = end?.getTime();

        if (typeof endMs === 'number' && Number.isFinite(endMs)) {
            return scope === 'done' ? endMs <= nowTs : endMs > nowTs;
        }
        if (typeof startMs === 'number' && Number.isFinite(startMs)) {
            return scope === 'done' ? startMs <= nowTs : startMs > nowTs;
        }
        return false;
    }, [nowTs]);
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
    const getListBorderColor = (ev: EnrichedEvent, defaultColor: string) => {
        const start = ev.start_date;
        const end = ev.end_date;
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

    const scopedCourseEvents = useMemo(() => {
        if (breakdownScope === 'total') return courseEvents;
        return courseEvents.filter(ev => isEventInScope(ev, breakdownScope));
    }, [courseEvents, breakdownScope, isEventInScope]);

    type Totals = {
        cm: number;
        td: number;
        tp: number;
        project: number;
        exam: number;
        other: number;
        total: number;
    };

    const makeTotals = useCallback((): Totals => ({
        cm: 0,
        td: 0,
        tp: 0,
        project: 0,
        exam: 0,
        other: 0,
        total: 0
    }), []);

    const getBucket = (typeRaw: string): 'cm' | 'td' | 'tp' | 'project' | 'exam' | 'other' => {
        const type = typeRaw.toUpperCase();
        if (type.includes('CM')) return 'cm';
        if (type.includes('TD')) return 'td';
        if (type.includes('TP')) return 'tp';
        if (type.includes('PROJET') || type.includes('PROJECT')) return 'project';
        if (type.includes('EXAM') || type.includes('DS') || type.includes('CC') || type.includes('CT')) return 'exam';
        return 'other';
    };

    const addDuration = useCallback((entry: Totals, bucket: ReturnType<typeof getBucket>, dur: number) => {
        if (bucket === 'cm') entry.cm += dur;
        else if (bucket === 'td') entry.td += dur;
        else if (bucket === 'tp') entry.tp += dur;
        else if (bucket === 'project') entry.project += dur;
        else if (bucket === 'exam') entry.exam += dur;
        else entry.other += dur;

        if (bucket === 'cm' || bucket === 'td' || bucket === 'tp' || bucket === 'project') {
            entry.total += dur;
        }
    }, []);

    const summary = useMemo(() => {
        const totals = makeTotals();
        scopedCourseEvents.forEach(ev => {
            const dur = ev.duration_hours || 0;
            const bucket = getBucket(ev.type_ || '');
            addDuration(totals, bucket, dur);
        });
        return totals;
    }, [scopedCourseEvents, makeTotals, addDuration]);

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
                const teacherNames = splitTeachers(ev.extractedTeacher);
                const targets = teacherNames.length > 0 ? teacherNames : [t.unknown];
                targets.forEach(name => addForKey(name, bucket, dur));
                return;
            }
            if (tab === 'promos') {
                const promoNames = splitPromos(ev.promo);
                const targets = promoNames.length > 0 ? promoNames : [t.unknown];
                targets.forEach(name => addForKey(name, bucket, dur));
                return;
            }
            addForKey(ev.raw.location?.trim() || t.unknown, bucket, dur);
        });

        return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
    }, [scopedCourseEvents, tab, t.unknown, splitTeachers, splitPromos, makeTotals, addDuration]);

    // Get color for selected subject
    const subjectColors = selectedSubject ? getSubjectColor(selectedSubject) : null;

    // Calendar Events Format
    const calendarEvents = useMemo(() => {
        const colors = subjectColors ?? getSubjectColor(selectedSubject);
        return scopedCourseEvents.map(ev => {
            return {
                title: `${ev.type_ || selectedSubject}`.trim(),
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
            <div className="course-mobile fade-in page-scroll course-mobile--shell">
                {!selectedSubject ? (
                    <SubjectPickerMobile
                        selectedCalendarId={selectedCalendarId}
                        calendarOptions={calendarOptions}
                        subjectFilter={subjectFilter}
                        subjects={subjects}
                        labels={{
                            title: t.subjects,
                            calendarFilterLabel: t.calendar_filter_label,
                            allCalendars: t.calendar_filter_all,
                            filterPlaceholder: t.filter_subjects,
                            subjectCountSingular: t.subject_count_singular,
                            subjectCountPlural: t.subject_count_plural
                        }}
                        onCalendarChange={setSelectedCalendarId}
                        onSubjectFilterChange={setSubjectFilter}
                        onSubjectSelect={(subject) => {
                            onSubjectChange(subject);
                            setTab('list');
                        }}
                    />
                ) : (
                    <div className="card course-mobile__content">
                        <div
                            className="course-mobile__header"
                            style={{
                                '--course-subject-bg': subjectColors ? getSubjectColorLight(selectedSubject) : 'var(--bg-color)',
                                '--course-accent': subjectColors?.bg || 'var(--primary-color)',
                            } as CSSProperties}
                        >
                            <div className="course-mobile__top-row">
                                <button
                                    className="btn course-mobile__back-btn"
                                    onClick={() => onSubjectChange('')}
                                >
                                    ← {t.back}
                                </button>
                                <h2 className="course-mobile__subject-title">
                                    <span className="course-mobile__subject-accent"></span>
                                    {selectedSubject}
                                </h2>
                            </div>

                            <div className="course-mobile__tabs">
                                <CourseTabs
                                    tab={tab}
                                    compact={true}
                                    labels={{
                                        list: t.list,
                                        calendar: t.calendar,
                                        byTeacher: t.by_teacher_short,
                                        byPromo: t.by_promo_short,
                                        byRoom: t.by_room_short,
                                    }}
                                    onTabChange={setTab}
                                />
                            </div>
                            <CourseSummary
                                size="mobile"
                                summary={summary}
                                scope={breakdownScope}
                                onScopeChange={setBreakdownScope}
                                labels={{
                                    totalLabel: t.total_label,
                                    project: t.project,
                                    servicePeriodLabel: t.service_period_label,
                                    servicePeriodTotal: t.service_period_total,
                                    servicePeriodDone: t.service_period_done,
                                    servicePeriodTodo: t.service_period_todo
                                }}
                            />
                        </div>

                        <div className="course-mobile__body">
                            {tab === 'list' && (
                                <CourseEventListMobile
                                    events={scopedCourseEvents}
                                    subjectColor={subjectColors?.bg || 'var(--primary-color)'}
                                    rawEventLabel={rawEventLabel}
                                    formatDateWithDay={formatDateWithDay}
                                    formatTime={formatTime}
                                    splitTeachers={splitTeachers}
                                    getListBorderColor={getListBorderColor}
                                    getTimeAccentColor={getTimeAccentColor}
                                    onOpenEvent={setSelectedEvent}
                                />
                            )}

                            {tab === 'calendar' && (
                                <CourseCalendarMobile
                                    view={mobileCalendarView}
                                    viewOptions={calendarViewOptions}
                                    events={calendarEvents}
                                    lang={lang}
                                    viewLabel={t.calendar_view_label}
                                    dayLetters={dayLetters}
                                    onViewChange={setMobileCalendarView}
                                    onSwipeStart={(x, y) => {
                                        mobileSwipeRef.current = { x, y };
                                    }}
                                    onSwipeEnd={(x, y) => {
                                        if (!mobileSwipeRef.current) return;
                                        const dx = x - mobileSwipeRef.current.x;
                                        const dy = y - mobileSwipeRef.current.y;
                                        mobileSwipeRef.current = null;
                                        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
                                        const api = mobileCalendarRef.current?.getApi();
                                        if (!api) return;
                                        if (dx < 0) api.next();
                                        else api.prev();
                                    }}
                                    calendarRef={mobileCalendarRef}
                                />
                            )}

                            {(tab === 'teachers' || tab === 'promos' || tab === 'rooms') && (
                                <BreakdownCards
                                    entries={activeBreakdown}
                                    labels={{
                                        project: t.project,
                                        total: t.total,
                                        exam: t.exam,
                                        other: t.other
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
            <CourseEventModal
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                labels={{
                    time: t.time,
                    location: t.location,
                    duration: t.duration,
                    unknown: t.unknown
                }}
                formatDateWithDay={formatDateWithDay}
                formatTime={formatTime}
            />
            </>
        );
    }

    return (
        <div className={`course-explorer fade-in full-height-view ${isTablet ? 'course-explorer--tablet' : ''}`}>

            <SubjectSidebarDesktop
                isTablet={isTablet}
                selectedCalendarId={selectedCalendarId}
                calendarOptions={calendarOptions}
                subjectFilter={subjectFilter}
                subjects={subjects}
                selectedSubject={selectedSubject}
                labels={{
                    title: t.subjects,
                    calendarFilterLabel: t.calendar_filter_label,
                    allCalendars: t.calendar_filter_all,
                    filterPlaceholder: t.filter_subjects,
                }}
                onCalendarChange={setSelectedCalendarId}
                onSubjectFilterChange={setSubjectFilter}
                onSubjectSelect={onSubjectChange}
            />

            {/* Main Content - RIGHT SIDE */}
            <div className="card course-explorer__main">
                {!selectedSubject ? (
                    <div className="course-explorer__empty">
                        <div className="course-explorer__empty-icon">📚</div>
                        <div className="course-explorer__empty-text">{t.select_subject_hint}</div>
                    </div>
                ) : (
                    <>
                        {/* Header & Stats Header */}
                        <div
                            className={`course-explorer__header ${isTablet ? 'course-explorer__header--tablet' : ''}`}
                            style={{
                                '--course-subject-bg': subjectColors ? getSubjectColorLight(selectedSubject) : 'var(--bg-color)',
                                '--course-accent': subjectColors?.bg || 'var(--primary-color)',
                            } as CSSProperties}
                        >
                            <div className={`course-explorer__header-row ${isTablet ? 'course-explorer__header-row--tablet' : ''}`}>
                                <h2 className={`course-explorer__subject-title ${isTablet ? 'course-explorer__subject-title--tablet' : ''}`}>
                                    <span className={`course-explorer__subject-accent ${isTablet ? 'course-explorer__subject-accent--tablet' : ''}`}></span>
                                    {selectedSubject}
                                </h2>
                                <CourseTabs
                                    tab={tab}
                                    compact={isTablet}
                                    labels={{
                                        list: t.list,
                                        calendar: t.calendar,
                                        byTeacher: t.by_teacher,
                                        byPromo: t.by_promo,
                                        byRoom: t.by_room,
                                    }}
                                    onTabChange={setTab}
                                />
                            </div>
                            <CourseSummary
                                size={isTablet ? 'tablet' : 'desktop'}
                                summary={summary}
                                scope={breakdownScope}
                                onScopeChange={setBreakdownScope}
                                labels={{
                                    totalLabel: t.total_label,
                                    project: t.project,
                                    servicePeriodLabel: t.service_period_label,
                                    servicePeriodTotal: t.service_period_total,
                                    servicePeriodDone: t.service_period_done,
                                    servicePeriodTodo: t.service_period_todo
                                }}
                            />
                        </div>

                        {/* Content Body */}
                        <div className={`course-explorer__body ${tab === 'calendar' ? 'course-explorer__body--calendar' : ''}`}>

                            {tab === 'list' && (
                                <CourseEventTableDesktop
                                    events={scopedCourseEvents}
                                    subjectColor={subjectColors?.bg || 'var(--primary-color)'}
                                    rawEventLabel={rawEventLabel}
                                    labels={{
                                        type: t.type,
                                        date: t.date,
                                        time: t.time,
                                        teacher: t.teacher,
                                        promo: t.promo,
                                        location: t.location,
                                        duration: t.duration
                                    }}
                                    formatDateWithDay={formatDateWithDay}
                                    formatTime={formatTime}
                                    splitTeachers={splitTeachers}
                                    getListBorderColor={getListBorderColor}
                                    getTimeAccentColor={getTimeAccentColor}
                                    onOpenEvent={setSelectedEvent}
                                />
                            )}

                            {tab === 'calendar' && (
                                <CourseCalendarDesktop
                                    events={calendarEvents}
                                    lang={lang}
                                    dayLetters={dayLetters}
                                />
                            )}

                            {tab === 'teachers' && (
                                <div>
                                    <BreakdownTable
                                        firstColumnLabel={t.source_teacher}
                                        entries={activeBreakdown}
                                        labels={{
                                            project: t.project,
                                            total: t.total,
                                            exam: t.exam,
                                            other: t.other
                                        }}
                                    />
                                    <p className="course-explorer__teacher-note">
                                        ℹ️ {t.teacher_breakdown_note}
                                    </p>
                                </div>
                            )}

                            {tab === 'promos' && (
                                <div>
                                    <BreakdownTable
                                        firstColumnLabel={t.promo}
                                        entries={activeBreakdown}
                                        labels={{
                                            project: t.project,
                                            total: t.total,
                                            exam: t.exam,
                                            other: t.other
                                        }}
                                    />
                                </div>
                            )}

                            {tab === 'rooms' && (
                                <div>
                                    <BreakdownTable
                                        firstColumnLabel={t.location}
                                        entries={activeBreakdown}
                                        labels={{
                                            project: t.project,
                                            total: t.total,
                                            exam: t.exam,
                                            other: t.other
                                        }}
                                    />
                                </div>
                            )}

                        </div>
                    </>
                )}
            </div>
            <CourseEventModal
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                labels={{
                    time: t.time,
                    location: t.location,
                    duration: t.duration,
                    unknown: t.unknown
                }}
                formatDateWithDay={formatDateWithDay}
                formatTime={formatTime}
            />
        </div>
    );
}
