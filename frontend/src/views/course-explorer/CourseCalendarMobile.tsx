import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import type { EventInput } from '@fullcalendar/core';
import type { RefObject } from 'react';

type CalendarView = 'timeGridWeek' | 'dayGridMonth' | 'listWeek';

interface Props {
  view: CalendarView;
  viewOptions: Array<{ value: CalendarView; label: string }>;
  events: EventInput[];
  lang: 'fr' | 'en';
  viewLabel: string;
  dayLetters: string[];
  onViewChange: (view: CalendarView) => void;
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
  onSwipeStart,
  onSwipeEnd,
  calendarRef,
}: Props) {
  const pad2 = (n: number) => n.toString().padStart(2, '0');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {viewLabel}
        </label>
        <select
          value={view}
          onChange={(e) => onViewChange(e.target.value as CalendarView)}
          style={{
            padding: '0.35rem 0.5rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg)',
            color: 'var(--text-color)',
            fontSize: '0.75rem'
          }}
        >
          {viewOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div
        style={{ height: '66vh', minHeight: 380 }}
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
          key={view}
          stickyHeaderDates={false}
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: ''
          }}
          events={events}
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
  );
}
