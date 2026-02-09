import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import type { EventInput } from '@fullcalendar/core';
import { useEffect, useMemo, useRef, useState } from 'react';

type CalendarView = 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';

const SLOT_STEP_MINUTES = 60;
const DEFAULT_SLOT_MIN_MINUTES = 7 * 60; // 07:00
const DEFAULT_SLOT_MAX_MINUTES = 20 * 60; // 20:00

const pad2 = (n: number) => n.toString().padStart(2, '0');
const floorToStep = (value: number, step: number) => Math.floor(value / step) * step;
const ceilToStep = (value: number, step: number) => Math.ceil(value / step) * step;
const toSlotTime = (minutes: number) => {
  if (minutes >= 24 * 60) return '24:00:00';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${pad2(h)}:${pad2(m)}:00`;
};

const toDate = (input: unknown): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const parsed = new Date(input as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

interface Props {
  events: EventInput[];
  lang: 'fr' | 'en';
  dayLetters: string[];
  onEventClick: (sourceIndex: unknown) => void;
  calendarWeekDays?: 5 | 6 | 7;
}

export function CourseCalendarDesktop({ events, lang, dayLetters, onEventClick, calendarWeekDays = 7 }: Props) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<CalendarView>('timeGridWeek');
  const [currentTitle, setCurrentTitle] = useState('');
  const [compactTitle, setCompactTitle] = useState('');
  const [useCompactTitle, setUseCompactTitle] = useState(false);

  const viewOptions: Array<{ value: CalendarView; label: string }> = [
    { value: 'timeGridDay', label: lang === 'fr' ? 'Jour' : 'Day' },
    { value: 'timeGridWeek', label: lang === 'fr' ? 'Semaine' : 'Week' },
    { value: 'dayGridMonth', label: lang === 'fr' ? 'Mois' : 'Month' },
  ];

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

  const formatShortDate = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = pad2(date.getFullYear() % 100);
    if (lang === 'fr') return `${day}/${month}/${year}`;
    return `${month}/${day}/${year}`;
  };

  const buildTitle = (viewType: string, start: Date, _end: Date, fallback: string) => {
    if (viewType !== 'timeGridWeek' && viewType !== 'timeGridDay') return fallback;
    const [, week = ''] = toWeekInputValue(start).split('-W');
    if (!week) return fallback;
    const prefix = `${lang === 'fr' ? 'S' : 'W'}${week}`;

    if (viewType === 'timeGridWeek') {
      const endInclusive = new Date(start);
      endInclusive.setDate(endInclusive.getDate() + (calendarWeekDays - 1));
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

  const buildCompactTitle = (viewType: string, start: Date, _end: Date, fallback: string) => {
    if (viewType !== 'timeGridWeek' && viewType !== 'timeGridDay') return fallback;
    const [, week = ''] = toWeekInputValue(start).split('-W');
    if (!week) return fallback;
    const prefix = `${lang === 'fr' ? 'S' : 'W'}${week}`;

    if (viewType === 'timeGridWeek') {
      const endInclusive = new Date(start);
      endInclusive.setDate(endInclusive.getDate() + (calendarWeekDays - 1));
      const startLabel = formatShortDate(start);
      const endLabel = formatShortDate(endInclusive);
      if (lang === 'fr') return `${prefix} : ${startLabel} - ${endLabel}`;
      return `${prefix}: ${startLabel} - ${endLabel}`;
    }

    const dayLabel = formatShortDate(start);
    if (lang === 'fr') return `${prefix} : ${dayLabel}`;
    return `${prefix}: ${dayLabel}`;
  };

  useEffect(() => {
    const titleEl = titleRef.current;
    if (!titleEl || !currentTitle) return;

    const measure = () => {
      const canvas = measureCanvasRef.current ?? document.createElement('canvas');
      measureCanvasRef.current = canvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setUseCompactTitle(false);
        return;
      }
      const style = window.getComputedStyle(titleEl);
      ctx.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const fullWidth = ctx.measureText(currentTitle).width;
      const availableWidth = titleEl.clientWidth;
      setUseCompactTitle(fullWidth > availableWidth + 1);
    };

    measure();
    const raf = window.requestAnimationFrame(measure);
    const onResize = () => measure();
    window.addEventListener('resize', onResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => measure());
      observer.observe(titleEl);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
    };
  }, [currentTitle, compactTitle, view]);

  const slotBounds = useMemo(() => {
    let earliestStartMinutes: number | null = null;
    let latestEndMinutes: number | null = null;

    for (const ev of events) {
      const startAt = toDate(ev.start);
      const endAt = toDate(ev.end);
      if (!startAt || !endAt) continue;

      const startMinutes = startAt.getHours() * 60 + startAt.getMinutes();
      const endMinutes = endAt.getHours() * 60 + endAt.getMinutes();
      const spansMultipleDays = (
        endAt.getFullYear() !== startAt.getFullYear() ||
        endAt.getMonth() !== startAt.getMonth() ||
        endAt.getDate() !== startAt.getDate()
      );
      const effectiveEndMinutes = spansMultipleDays
        ? 24 * 60
        : Math.max(endMinutes, startMinutes + SLOT_STEP_MINUTES);

      earliestStartMinutes = earliestStartMinutes === null
        ? startMinutes
        : Math.min(earliestStartMinutes, startMinutes);
      latestEndMinutes = latestEndMinutes === null
        ? effectiveEndMinutes
        : Math.max(latestEndMinutes, effectiveEndMinutes);
    }

    let minMinutes = DEFAULT_SLOT_MIN_MINUTES;
    let maxMinutes = DEFAULT_SLOT_MAX_MINUTES;

    if (earliestStartMinutes !== null && earliestStartMinutes < minMinutes) {
      minMinutes = floorToStep(earliestStartMinutes, SLOT_STEP_MINUTES);
    }
    if (latestEndMinutes !== null && latestEndMinutes > maxMinutes) {
      maxMinutes = ceilToStep(latestEndMinutes, SLOT_STEP_MINUTES);
    }

    minMinutes = Math.max(0, Math.min(minMinutes, 23 * 60));
    maxMinutes = Math.max(SLOT_STEP_MINUTES, Math.min(maxMinutes, 24 * 60));
    if (maxMinutes <= minMinutes + SLOT_STEP_MINUTES) {
      maxMinutes = Math.min(24 * 60, minMinutes + 2 * SLOT_STEP_MINUTES);
    }

    return {
      min: toSlotTime(minMinutes),
      max: toSlotTime(maxMinutes),
    };
  }, [events]);

  const hiddenDays = useMemo(() => {
    if (calendarWeekDays === 5) return [0, 6];
    if (calendarWeekDays === 6) return [0];
    return undefined;
  }, [calendarWeekDays]);

  const goPrev = () => calendarRef.current?.getApi().prev();
  const goToday = () => calendarRef.current?.getApi().today();
  const goNext = () => calendarRef.current?.getApi().next();

  return (
    <div className="course-calendar-desktop agenda-mobile">
      <div className="agenda-mobile-controls course-calendar-desktop__controls">
        <div className="agenda-mobile-nav">
          <div className="agenda-mobile-move">
            <button className="btn" onClick={goPrev} aria-label={lang === 'fr' ? 'Précédent' : 'Previous'}>&lt;</button>
            <button className="btn" onClick={goToday} aria-label={lang === 'fr' ? 'Aujourd’hui' : 'Today'}>○</button>
            <button className="btn" onClick={goNext} aria-label={lang === 'fr' ? 'Suivant' : 'Next'}>&gt;</button>
          </div>
          <div ref={titleRef} className="agenda-mobile-title">
            {useCompactTitle && compactTitle ? compactTitle : currentTitle}
          </div>
          <div className="agenda-mobile-views">
            {viewOptions.map((opt) => (
              <button
                key={opt.value}
                className={`btn agenda-mobile-view-btn ${view === opt.value ? 'active' : ''}`}
                onClick={() => {
                  setView(opt.value);
                  calendarRef.current?.getApi().changeView(opt.value);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="course-calendar-desktop__body">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          initialView={view}
          stickyHeaderDates={false}
          headerToolbar={false}
          events={events}
          locale={lang === 'fr' ? frLocale : undefined}
          firstDay={1}
          hiddenDays={hiddenDays}
          dayHeaderContent={(arg) => {
            if (arg.view.type.includes('list')) return undefined;
            const letter = dayLetters[arg.date.getDay()] || '';
            const dayNum = pad2(arg.date.getDate());
            return `${letter} ${dayNum}`;
          }}
          eventContent={(arg) => {
            const title = `${arg.event.title || ''}`.trim();
            const teacher = `${arg.event.extendedProps.teacher || ''}`.trim();
            const location = `${arg.event.extendedProps.location || ''}`.trim();
            const durationHours = Number(arg.event.extendedProps.durationHours || 0);

            if (arg.view.type.includes('list')) {
              return { html: title };
            }

            if (arg.view.type === 'dayGridMonth') {
              return {
                html: `
                  <div class="fc-event-main-frame" style="padding: 1px 4px; height: 100%; display: flex; align-items: center; overflow: hidden;">
                    <div class="fc-event-title fc-sticky" style="font-weight: 600; font-size: 0.79rem; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>
                  </div>
                `
              };
            }

            const showTeacher = teacher && teacher !== '—' && durationHours >= 1;
            const showLocation = Boolean(location);
            const titleLineClamp = durationHours >= 2 ? 3 : 2;
            const teacherLine = showTeacher
              ? `<div class="fc-event-teacher" style="font-size: 0.72rem; line-height: 1.2; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">${teacher}</div>`
              : '';
            const locationLine = showLocation
              ? `<div class="fc-event-location" style="font-size: 0.68rem; line-height: 1.2; opacity: 0.82; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">${location}</div>`
              : '';

            return {
              html: `
                <div class="fc-event-main-frame" style="padding: 2px 4px; height: 100%; display: flex; flex-direction: column; overflow: hidden;">
                  <div class="fc-event-title-container" style="flex-shrink: 0;">
                    <div class="fc-event-title fc-sticky" style="font-weight: 600; font-size: 0.82rem; line-height: 1.15; white-space: normal; overflow: hidden; display: -webkit-box; -webkit-line-clamp: ${titleLineClamp}; -webkit-box-orient: vertical;">
                      ${title}
                    </div>
                  </div>
                  ${teacherLine}
                  ${locationLine}
                </div>
              `
            };
          }}
          eventClick={(arg) => {
            onEventClick(arg.event.extendedProps.sourceIndex);
          }}
          eventDidMount={(arg) => {
            arg.el.style.cursor = 'pointer';
          }}
          datesSet={(arg) => {
            const titleWithBadge = buildTitle(arg.view.type, arg.start, arg.end, arg.view.title);
            setCurrentTitle((prev) => (prev === titleWithBadge ? prev : titleWithBadge));
            const nextCompact = buildCompactTitle(arg.view.type, arg.start, arg.end, arg.view.title);
            setCompactTitle((prev) => (prev === nextCompact ? prev : nextCompact));
            const nextView = arg.view.type as CalendarView;
            setView((prev) => (prev === nextView ? prev : nextView));
          }}
          height="100%"
          expandRows={true}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          slotMinTime={slotBounds.min}
          slotMaxTime={slotBounds.max}
          allDaySlot={false}
          nowIndicator={true}
        />
      </div>
    </div>
  );
}
