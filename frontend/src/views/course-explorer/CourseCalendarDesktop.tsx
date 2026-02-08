import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';
import type { EventInput } from '@fullcalendar/core';

interface Props {
  events: EventInput[];
  lang: 'fr' | 'en';
  dayLetters: string[];
}

export function CourseCalendarDesktop({ events, lang, dayLetters }: Props) {
  const pad2 = (n: number) => n.toString().padStart(2, '0');

  return (
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
        expandRows={true}
      />
    </div>
  );
}
