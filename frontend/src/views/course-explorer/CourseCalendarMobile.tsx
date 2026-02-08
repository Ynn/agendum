import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import type { EventInput } from '@fullcalendar/core';
import { clsx } from 'clsx';
import { useEffect, useRef, useState, type RefObject } from 'react';

type CalendarView = 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';

interface Props {
  view: CalendarView;
  viewOptions: Array<{ value: CalendarView; label: string }>;
  events: EventInput[];
  lang: 'fr' | 'en';
  viewLabel: string;
  dayLetters: string[];
  onViewChange: (view: CalendarView) => void;
  onEventClick: (sourceIndex: unknown) => void;
  onSwipeStart: (x: number, y: number) => void;
  onSwipeEnd: (x: number, y: number) => void;
  calendarRef: RefObject<FullCalendar | null>;
}

export function CourseCalendarMobile({
  view,
  viewOptions,
  events,
  lang,
  viewLabel,
  dayLetters,
  onViewChange,
  onEventClick,
  onSwipeStart,
  onSwipeEnd,
  calendarRef,
}: Props) {
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('');
  const [compactTitle, setCompactTitle] = useState('');
  const [useCompactTitle, setUseCompactTitle] = useState(false);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  const buildCompactTitle = (viewType: string, start: Date, end: Date, fallback: string) => {
    if (viewType !== 'timeGridWeek' && viewType !== 'timeGridDay') return fallback;
    const [, week = ''] = toWeekInputValue(start).split('-W');
    if (!week) return fallback;
    const prefix = `${lang === 'fr' ? 'S' : 'W'}${week}`;

    if (viewType === 'timeGridWeek') {
      const endInclusive = new Date(end);
      endInclusive.setDate(endInclusive.getDate() - 1);
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
    if (!isFullscreen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

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

  const goPrev = () => calendarRef.current?.getApi().prev();
  const goToday = () => calendarRef.current?.getApi().today();
  const goNext = () => calendarRef.current?.getApi().next();

  return (
    <div className={clsx('course-calendar-mobile agenda-mobile', isFullscreen && 'course-calendar-mobile--fullscreen')}>
      <div className="agenda-mobile-controls course-calendar-mobile__controls">
        <div className="agenda-mobile-nav">
          <div className="agenda-mobile-move">
            <button className="btn" onClick={goPrev} aria-label={lang === 'fr' ? 'Précédent' : 'Previous'}>&lt;</button>
            <button className="btn" onClick={goToday} aria-label={lang === 'fr' ? 'Aujourd’hui' : 'Today'}>○</button>
            <button className="btn" onClick={goNext} aria-label={lang === 'fr' ? 'Suivant' : 'Next'}>&gt;</button>
            <button
              className="btn course-calendar-mobile__fullscreen-btn"
              onClick={() => setIsFullscreen((prev) => !prev)}
              aria-label={isFullscreen ? (lang === 'fr' ? 'Quitter le plein écran' : 'Exit fullscreen') : (lang === 'fr' ? 'Plein écran' : 'Fullscreen')}
              title={isFullscreen ? (lang === 'fr' ? 'Quitter' : 'Exit') : (lang === 'fr' ? 'Plein écran' : 'Fullscreen')}
            >
              {isFullscreen ? '⤡' : '⤢'}
            </button>
          </div>
          <div ref={titleRef} className="agenda-mobile-title">
            {useCompactTitle && compactTitle ? compactTitle : (currentTitle || viewLabel)}
          </div>
          <div className="agenda-mobile-views">
            {viewOptions.map((opt) => (
              <button
                key={opt.value}
                className={`btn agenda-mobile-view-btn ${view === opt.value ? 'active' : ''}`}
                onClick={() => onViewChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        className="course-calendar-mobile__body"
        onTouchStart={(e) => {
          if (e.touches.length !== 1) return;
          const touch = e.touches[0];
          onSwipeStart(touch.clientX, touch.clientY);
        }}
        onTouchEnd={(e) => {
          if (e.changedTouches.length !== 1) return;
          const touch = e.changedTouches[0];
          onSwipeEnd(touch.clientX, touch.clientY);
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          initialView={view}
          stickyHeaderDates={false}
          headerToolbar={false}
          events={events}
          locale={lang === 'fr' ? frLocale : undefined}
          firstDay={1}
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

            const showTeacher = arg.view.type.startsWith('timeGrid') && teacher && teacher !== '—' && durationHours >= 1;
            const titleLineClamp = durationHours >= 2 ? 3 : 2;
            const locationLineClamp = showTeacher ? (durationHours >= 2 ? 2 : 1) : 2;
            const teacherLine = showTeacher
              ? `<div class="fc-event-teacher" style="font-size: 0.6rem; opacity: 0.88; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${teacher}</div>`
              : '';
            const locationLine = location
              ? `<div class="fc-event-location" style="font-size: 0.6rem; opacity: 0.8; line-height: 1.1; white-space: normal; word-break: break-word; overflow: hidden; display: -webkit-box; -webkit-line-clamp: ${locationLineClamp}; -webkit-box-orient: vertical;">${location}</div>`
              : '';

            return {
              html: `
                <div class="fc-event-main-frame" style="padding: 1px 3px; height: 100%; display: flex; flex-direction: column; gap: 1px; overflow: hidden;">
                  <div class="fc-event-title fc-sticky" style="font-weight: 600; font-size: 0.68rem; line-height: 1.15; white-space: normal; overflow: hidden; display: -webkit-box; -webkit-line-clamp: ${titleLineClamp}; -webkit-box-orient: vertical;">${title}</div>
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
          }}
          height="100%"
          expandRows={true}
        />
      </div>
    </div>
  );
}
