import type { EnrichedEvent } from '../../types';

interface Props {
  events: EnrichedEvent[];
  subjectColor: string;
  rawEventLabel: string;
  labels: {
    type: string;
    date: string;
    time: string;
    teacher: string;
    promo: string;
    location: string;
    duration: string;
  };
  formatDateWithDay: (d?: Date) => string;
  formatTime: (d?: Date) => string;
  splitTeachers: (value?: string) => string[];
  getListBorderColor: (event: EnrichedEvent, defaultColor: string) => string;
  getTimeAccentColor: (start?: Date) => string;
  onOpenEvent: (event: EnrichedEvent) => void;
}

export function CourseEventTableDesktop({
  events,
  subjectColor,
  rawEventLabel,
  labels,
  formatDateWithDay,
  formatTime,
  splitTeachers,
  getListBorderColor,
  getTimeAccentColor,
  onOpenEvent,
}: Props) {
  const getTypeTone = (value: string) => {
    const upper = value.toUpperCase();
    if (upper.includes('CM')) return 'cm';
    if (upper.includes('TD')) return 'td';
    if (upper.includes('TP')) return 'tp';
    return 'other';
  };

  return (
    <div className="course-events-table-wrap">
      <table className="course-events-table">
        <thead className="course-events-table__head">
          <tr className="course-events-table__head-row">
            <th className="course-events-table__head-cell">{labels.type}</th>
            <th className="course-events-table__head-cell">{labels.date}</th>
            <th className="course-events-table__head-cell">{labels.time}</th>
            <th className="course-events-table__head-cell">{labels.teacher}</th>
            <th className="course-events-table__head-cell">{labels.promo}</th>
            <th className="course-events-table__head-cell">{labels.location}</th>
            <th className="course-events-table__head-cell">{labels.duration}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => {
            const borderColor = getListBorderColor(event, subjectColor);
            const timeAccentColor = getTimeAccentColor(event.start_date);
            return (
              <tr
                key={index}
                className="course-events-table__row"
              >
                <td className="course-events-table__cell course-events-table__cell--type" style={{ borderLeftColor: borderColor }}>
                  <div className="course-events-table__type-wrap">
                    <span className={`course-events-table__type-badge course-events-table__type-badge--${getTypeTone(event.type_)}`}>
                      {event.type_}
                    </span>
                    <button
                      className="btn course-events-table__raw-btn"
                      title={rawEventLabel}
                      aria-label={rawEventLabel}
                      onClick={() => onOpenEvent(event)}
                    >
                      ⓘ
                    </button>
                  </div>
                </td>
                <td className="course-events-table__cell course-events-table__cell--date">{formatDateWithDay(event.start_date)}</td>
                <td className="course-events-table__cell course-events-table__cell--time">
                  <span className="course-events-table__time-wrap">
                    <span
                      aria-hidden
                      className="course-events-table__time-accent"
                      style={{ background: timeAccentColor }}
                    />
                    <span>
                      {formatTime(event.start_date)} - {formatTime(event.end_date)}
                    </span>
                  </span>
                </td>
                <td className="course-events-table__cell course-events-table__cell--teacher">
                  {splitTeachers(event.extractedTeacher).join(', ') || '—'}
                </td>
                <td className="course-events-table__cell course-events-table__cell--promo">
                  <div title={event.promo || '—'} className="course-events-table__promo-value">
                    {event.promo || '—'}
                  </div>
                </td>
                <td className="course-events-table__cell course-events-table__cell--location">
                  {event.raw.location || '—'}
                </td>
                <td className="course-events-table__cell course-events-table__cell--duration">{event.duration_hours}h</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
