import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { NormalizedEvent } from '../types';
import frLocale from '@fullcalendar/core/locales/fr';
import { useLang, useT } from '../i18n';
import { getSubjectColor } from '../utils/colors';

export function Agenda({
    events,
    isMobile = false
}: {
    events: (NormalizedEvent & { color?: string })[];
    isMobile?: boolean;
}) {
    const lang = useLang();
    const t = useT();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const calendarRef = useRef<FullCalendar | null>(null);
    const swipeRef = useRef<{ x: number; y: number } | null>(null);
    const [currentView, setCurrentView] = useState('timeGridWeek');
    const [currentTitle, setCurrentTitle] = useState('');
    const [weekValue, setWeekValue] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [listRange, setListRange] = useState<{ start: string; end: string; enabled: boolean }>({
        start: '',
        end: '',
        enabled: false
    });

    const getApi = () => calendarRef.current?.getApi();

    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const toDateInput = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    const parseYMD = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };
    const addDays = (dateStr: string, days: number) => {
        const d = parseYMD(dateStr);
        if (!d) return dateStr;
        d.setDate(d.getDate() + days);
        return toDateInput(d);
    };
    const diffDays = (start: string, end: string) => {
        const s = parseYMD(start);
        const e = parseYMD(end);
        if (!s || !e) return 0;
        const ms = e.getTime() - s.getTime();
        return Math.round(ms / 86400000);
    };

    const toWeekInputValue = (date: Date) => {
        const target = new Date(date.valueOf());
        const dayNr = (date.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = new Date(target.getFullYear(), 0, 4);
        const diff = target.valueOf() - firstThursday.valueOf();
        const week = 1 + Math.round(diff / 604800000);
        return `${target.getFullYear()}-W${pad2(week)}`;
    };

    const formatDayMonth = (date: Date) => {
        const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
        const formatted = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
        return lang === 'fr' ? formatted.replace(',', '') : formatted;
    };

    const formatDayMonthYear = (date: Date) => {
        const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
        const formatted = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
        return lang === 'fr' ? formatted.replace(',', '') : formatted;
    };

    const buildTitle = (viewType: string, start: Date, end: Date, fallback: string) => {
        if (viewType !== 'timeGridWeek' && viewType !== 'timeGridDay') return fallback;
        const [, week = ''] = toWeekInputValue(start).split('-W');
        if (!week) return fallback;
        const prefix = `${lang === 'fr' ? 'S' : 'W'}${week}`;

        if (viewType === 'timeGridWeek') {
            const endInclusive = new Date(end);
            endInclusive.setDate(endInclusive.getDate() - 1);
            const startLabel = formatDayMonth(start);
            const endLabel = formatDayMonth(endInclusive);
            const year = endInclusive.getFullYear();
            if (lang === 'fr') return `${prefix} : ${startLabel} – ${endLabel} ${year}`;
            return `${prefix}: ${startLabel} - ${endLabel}, ${year}`;
        }

        const dayLabel = formatDayMonthYear(start);
        if (lang === 'fr') return `${prefix} : ${dayLabel}`;
        return `${prefix}: ${dayLabel}`;
    };

    const weekToDate = (value: string) => {
        const [y, w] = value.split('-W');
        const year = Number(y);
        const week = Number(w);
        if (!year || !week) return null;
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const isoWeekStart = new Date(simple);
        if (dow <= 4) isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
        return isoWeekStart;
    };

    const isListView = currentView.startsWith('list');
    const weekInputSupported = useMemo(() => {
        if (typeof document === 'undefined') return true;
        const input = document.createElement('input');
        input.setAttribute('type', 'week');
        return input.type === 'week';
    }, []);
    const weekDateValue = useMemo(() => {
        const d = weekToDate(weekValue);
        return d ? toDateInput(d) : '';
    }, [weekValue]);
    const dayLetters = lang === 'fr'
        ? ['D', 'L', 'M', 'M', 'J', 'V', 'S']
        : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    useEffect(() => {
        if (!isListView) return;
        if (listRange.start && listRange.end) return;
        const today = new Date();
        const start = toDateInput(today);
        const end = addDays(start, 6);
        setListRange({ start, end, enabled: true });
    }, [isListView, listRange.start, listRange.end]);

    useEffect(() => {
        if (!isListView || !listRange.enabled || !listRange.start) return;
        const api = getApi();
        if (!api) return;
        const current = toDateInput(api.getDate());
        if (current === listRange.start) return;
        api.gotoDate(listRange.start);
    }, [isListView, listRange.enabled, listRange.start]);

    useEffect(() => {
        if (isMobile || !currentTitle) return;
        const applyTitle = () => {
            const titleEl = containerRef.current?.querySelector('.fc-toolbar-title');
            if (titleEl && titleEl.textContent !== currentTitle) {
                titleEl.textContent = currentTitle;
            }
        };
        applyTitle();
        const raf = window.requestAnimationFrame(applyTitle);
        return () => window.cancelAnimationFrame(raf);
    }, [isMobile, currentTitle]);

    const listDays = useMemo(() => {
        if (!listRange.enabled || !listRange.start || !listRange.end) return 7;
        const days = diffDays(listRange.start, listRange.end) + 1;
        return Math.max(1, days);
    }, [listRange.enabled, listRange.start, listRange.end]);

    const listVisibleRange = useMemo(() => {
        if (!isListView || !listRange.enabled || !listRange.start || !listRange.end) return undefined;
        const endExclusive = addDays(listRange.end, 1);
        return { start: listRange.start, end: endExclusive };
    }, [isListView, listRange.enabled, listRange.start, listRange.end]);

    const goPrev = () => {
        if (isListView && listRange.enabled && listRange.start && listRange.end) {
            const shift = diffDays(listRange.start, listRange.end) + 1;
            const newStart = addDays(listRange.start, -shift);
            const newEnd = addDays(listRange.end, -shift);
            setListRange(prev => ({ ...prev, start: newStart, end: newEnd, enabled: true }));
            return;
        }
        getApi()?.prev();
    };

    const goToday = () => {
        getApi()?.today();
        if (isListView) {
            setListRange(prev => ({ ...prev, enabled: false }));
        }
    };

    const goNext = () => {
        if (isListView && listRange.enabled && listRange.start && listRange.end) {
            const shift = diffDays(listRange.start, listRange.end) + 1;
            const newStart = addDays(listRange.start, shift);
            const newEnd = addDays(listRange.end, shift);
            setListRange(prev => ({ ...prev, start: newStart, end: newEnd, enabled: true }));
            return;
        }
        getApi()?.next();
    };

    const eventsForView = useMemo(() => {
        if (!isListView || !listRange.enabled || !listRange.start || !listRange.end) return events;
        const start = parseYMD(listRange.start);
        const end = parseYMD(listRange.end);
        if (!start || !end) return events;
        const endExclusive = new Date(end);
        endExclusive.setDate(endExclusive.getDate() + 1);
        return events.filter(ev => {
            const startAt = (ev as any).start_date ? new Date((ev as any).start_date) : new Date(ev.start_iso);
            const endAt = (ev as any).end_date ? new Date((ev as any).end_date) : new Date(ev.end_iso);
            if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return false;
            return startAt < endExclusive && endAt >= start;
        });
    }, [events, isListView, listRange.enabled, listRange.start, listRange.end]);

    // Map events to FullCalendar format with deterministic subject colors
    const fcEvents = eventsForView.map(ev => {
        const subjectColors = getSubjectColor(ev.subject || '');
        const teacher = (ev as any).extractedTeacher || '';
        const location = ev.raw.location || '';

        // Build compact title: "TYPE Subject • Teacher • Room"
        let title = `${ev.type_} ${ev.subject}`;
        if (!isMobile && teacher && teacher !== '—') {
            title += ` • ${teacher}`;
        }
        if (!isMobile && location) {
            title += ` • ${location}`;
        }

        return {
            title,
            start: ev.start_iso, // ISO string from Rust
            end: ev.end_iso,
            backgroundColor: subjectColors.bg,
            borderColor: subjectColors.bg,
            textColor: subjectColors.text,
            extendedProps: {
                location: ev.raw.location,
                description: ev.raw.description,
                duration: ev.duration_hours, // For info
                teacher: teacher
            }
        };
    });

    return (
        <div
            ref={containerRef}
            className={`agenda-container ${isMobile ? 'agenda-mobile' : ''}`}
            style={{
            background: 'var(--card-bg)',
            padding: isMobile ? '0.2rem' : '0.75rem',
            borderRadius: isMobile ? '10px' : 'var(--radius)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            flex: 1,
            overflow: 'auto'
        }}
            onTouchStart={(e) => {
                if (!isMobile || e.touches.length !== 1) return;
                const t = e.touches[0];
                swipeRef.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={(e) => {
                if (!isMobile || !swipeRef.current || e.changedTouches.length !== 1) return;
                const t = e.changedTouches[0];
                const dx = t.clientX - swipeRef.current.x;
                const dy = t.clientY - swipeRef.current.y;
                swipeRef.current = null;
                if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
                const api = getApi();
                if (!api) return;
                if (dx < 0) api.next();
                else api.prev();
            }}
        >
            {isMobile && (
                <div className="agenda-mobile-controls">
                    <div className="agenda-mobile-nav">
                        <div className="agenda-mobile-move">
                            <button className="btn" onClick={goPrev} aria-label={lang === 'fr' ? 'Précédent' : 'Previous'}>&lt;</button>
                            <button className="btn" onClick={goToday} aria-label={lang === 'fr' ? 'Aujourd’hui' : 'Today'}>○</button>
                            <button className="btn" onClick={goNext} aria-label={lang === 'fr' ? 'Suivant' : 'Next'}>&gt;</button>
                        </div>
                        <div className="agenda-mobile-title">{currentTitle}</div>
                        <div className="agenda-mobile-views">
                            <button
                                className={`btn agenda-mobile-view-btn ${currentView === 'timeGridDay' ? 'active' : ''}`}
                                onClick={() => getApi()?.changeView('timeGridDay')}
                            >
                                {lang === 'fr' ? 'Jour' : 'Day'}
                            </button>
                            <button
                                className={`btn agenda-mobile-view-btn ${currentView === 'timeGridWeek' ? 'active' : ''}`}
                                onClick={() => getApi()?.changeView('timeGridWeek')}
                            >
                                {lang === 'fr' ? 'Semaine' : 'Week'}
                            </button>
                            <button
                                className={`btn agenda-mobile-view-btn ${currentView === 'dayGridMonth' ? 'active' : ''}`}
                                onClick={() => getApi()?.changeView('dayGridMonth')}
                            >
                                {lang === 'fr' ? 'Mois' : 'Month'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                views={{
                    listRange: { type: 'list', duration: { days: listDays } }
                }}
                visibleRange={listVisibleRange}
                stickyHeaderDates={false}
                headerToolbar={isMobile ? false : {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'timeGridDay,timeGridWeek,dayGridMonth,listRange'
                }}
                buttonText={{
                    today: lang === 'fr' ? 'Aujourd’hui' : 'Today',
                    day: lang === 'fr' ? 'Jour' : 'Day',
                    week: lang === 'fr' ? 'Semaine' : 'Week',
                    month: lang === 'fr' ? 'Mois' : 'Month',
                    list: lang === 'fr' ? 'Liste' : 'List',
                    listRange: lang === 'fr' ? 'Liste' : 'List',
                }}
                events={fcEvents}
                eventClick={(info) => {
                    setSelectedEvent(info.event);
                }}
                dayHeaderContent={(arg) => {
                    if (arg.view.type.includes('list')) return undefined;
                    const letter = dayLetters[arg.date.getDay()] || '';
                    const dayNum = pad2(arg.date.getDate());
                    return `${letter} ${dayNum}`;
                }}
                eventContent={(arg) => {
                    const teacher = arg.event.extendedProps.teacher || '';
                    const location = arg.event.extendedProps.location || '';
                    const title = `${arg.event.title.split(' • ')[0]}`; // Just "TYPE Subject"

                    // For list view, use default rendering
                    if (arg.view.type.includes('list')) {
                        if (isMobile) return { html: title };
                        return { html: arg.event.title };
                    }

                    if (isMobile) {
                        const locationLine = location
                            ? `<div class="fc-event-location" style="font-size: 0.6rem; opacity: 0.8; line-height: 1.1; white-space: normal; word-break: break-word; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                                    ${location}
                               </div>`
                            : '';
                        return {
                            html: `
                                <div class="fc-event-main-frame" style="padding: 1px 3px; height: 100%; display: flex; flex-direction: column; gap: 1px; overflow: hidden;">
                                    <div class="fc-event-title fc-sticky" style="font-weight: 600; font-size: 0.68rem; line-height: 1.15; white-space: normal; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                                        ${title}
                                    </div>
                                    ${locationLine}
                                </div>
                            `
                        };
                    }

                    // Custom multi-line rendering for grid/time views
                    return {
                        html: `
                            <div class="fc-event-main-frame" style="padding: 2px 4px; height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                                <div class="fc-event-title-container" style="flex-shrink: 0;">
                                    <div class="fc-event-title fc-sticky" style="font-weight: 600; font-size: 0.85rem; line-height: 1.2; white-space: normal; overflow: hidden; text-overflow: ellipsis;">
                                        ${title}
                                    </div>
                                </div>
                                ${teacher ? `<div class="fc-event-teacher" style="font-size: 0.75rem; line-height: 1.2; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">${teacher}</div>` : ''}
                                ${location ? `<div class="fc-event-location" style="font-size: 0.7rem; line-height: 1.2; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">${location}</div>` : ''}
                            </div>
                        `
                    };
                }}
                locale={lang === 'fr' ? frLocale : undefined}
                firstDay={1}
                height={isMobile ? '100%' : 'auto'}
                slotMinTime={isMobile ? '07:30:00' : '08:00:00'}
                slotMaxTime={isMobile ? '20:30:00' : '20:00:00'}
                allDaySlot={false}
                nowIndicator={true}
                datesSet={(arg) => {
                    setCurrentView(prev => (prev === arg.view.type ? prev : arg.view.type));
                    const nextWeek = toWeekInputValue(arg.start);
                    setWeekValue(prev => (prev === nextWeek ? prev : nextWeek));
                    const titleWithBadge = buildTitle(arg.view.type, arg.start, arg.end, arg.view.title);
                    setCurrentTitle(prev => (prev === titleWithBadge ? prev : titleWithBadge));
                }}
            />

            {!isMobile && (
            <div className="agenda-nav">
                <div className="agenda-nav-buttons">
                    <button
                        className="btn"
                        onClick={goPrev}
                    >◀</button>
                    <button
                        className="btn"
                        onClick={goToday}
                    >{lang === 'fr' ? 'Aujourd’hui' : 'Today'}</button>
                    <button
                        className="btn"
                        onClick={goNext}
                    >▶</button>
                </div>
                {!isListView && (
                    <div className="agenda-week-picker">
                        <span>{lang === 'fr' ? 'Semaine' : 'Week'}</span>
                        <input
                            type={weekInputSupported ? 'week' : 'date'}
                            value={weekInputSupported ? weekValue : weekDateValue}
                            onChange={(e) => {
                                if (weekInputSupported) {
                                    const d = weekToDate(e.target.value);
                                    if (d) getApi()?.gotoDate(d);
                                    setWeekValue(e.target.value);
                                    return;
                                }
                                const d = parseYMD(e.target.value);
                                if (d) {
                                    getApi()?.gotoDate(d);
                                    setWeekValue(toWeekInputValue(d));
                                }
                            }}
                        />
                    </div>
                )}
                {isListView && (
                    <div className="agenda-range-picker">
                        <span>{t.date_range}</span>
                        <input
                            type="date"
                            value={listRange.start}
                            onChange={(e) => {
                                const nextStart = e.target.value;
                                setListRange(prev => {
                                    const nextEnd = prev.end;
                                    let start = nextStart;
                                    let end = nextEnd;
                                    if (start && end && start > end) {
                                        [start, end] = [end, start];
                                    }
                                    const enabled = Boolean(start && end);
                                    if (prev.start === start && prev.end === end && prev.enabled === enabled) return prev;
                                    return { ...prev, start, end, enabled };
                                });
                            }}
                        />
                        <span>—</span>
                        <input
                            type="date"
                            value={listRange.end}
                            onChange={(e) => {
                                const nextEnd = e.target.value;
                                setListRange(prev => {
                                    const nextStart = prev.start;
                                    let start = nextStart;
                                    let end = nextEnd;
                                    if (start && end && start > end) {
                                        [start, end] = [end, start];
                                    }
                                    const enabled = Boolean(start && end);
                                    if (prev.start === start && prev.end === end && prev.enabled === enabled) return prev;
                                    return { ...prev, start, end, enabled };
                                });
                            }}
                        />
                        <button
                            className="btn"
                            onClick={() => setListRange(prev => (prev.enabled ? { ...prev, enabled: false } : prev))}
                        >
                            {t.reset}
                        </button>
                    </div>
                )}
            </div>
            )}

            {selectedEvent && (
                <div className="event-modal-overlay">
                    <div className="event-modal-backdrop" onClick={() => setSelectedEvent(null)} />
                    <div className="card event-modal">
                        <div className="event-modal-header">
                            <div style={{ fontWeight: 700 }}>{selectedEvent.title}</div>
                            <button className="btn" onClick={() => setSelectedEvent(null)} style={{ padding: '0.2rem 0.6rem' }}>×</button>
                        </div>
                        <div className="event-modal-grid">
                            <div><strong>{t.time}:</strong> {selectedEvent.start?.toLocaleTimeString()} - {selectedEvent.end?.toLocaleTimeString()}</div>
                            <div><strong>{t.location}:</strong> {selectedEvent.extendedProps.location || '—'}</div>
                            <div><strong>{t.duration}:</strong> {selectedEvent.extendedProps.duration}h</div>
                        </div>
                        {selectedEvent.extendedProps.description && (
                            <div style={{ marginTop: '0.5rem', color: '#475569', fontSize: '0.9rem' }}>
                                {selectedEvent.extendedProps.description}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
