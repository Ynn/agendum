import type { EnrichedEvent } from '../../types';
import { formatSessionLabel, type SessionOrdinalInfo } from '../../utils/sessionOrdinals';

interface Props {
  events: EnrichedEvent[];
  subjectColor: string;
  rawEventLabel: string;
  sessionOrdinals: Map<EnrichedEvent, SessionOrdinalInfo | null>;
  formatDateWithDay: (d?: Date) => string;
  formatTime: (d?: Date) => string;
  splitTeachers: (value?: string) => string[];
  getListBorderColor: (event: EnrichedEvent, defaultColor: string) => string;
  getTimeAccentColor: (start?: Date) => string;
  onOpenEvent: (event: EnrichedEvent) => void;
}

export function CourseEventListMobile({
  events,
  subjectColor,
  rawEventLabel,
  sessionOrdinals,
  formatDateWithDay,
  formatTime,
  splitTeachers,
  getListBorderColor,
  getTimeAccentColor,
  onOpenEvent,
}: Props) {
  return (
    <div className="course-events-mobile">
      {events.map((event, index) => {
        const promoText = event.promo || '—';
        const borderColor = getListBorderColor(event, subjectColor);
        const timeAccentColor = getTimeAccentColor(event.start_date);
        const sessionInfo = sessionOrdinals.get(event) ?? null;
        const typeLabel = sessionInfo ? formatSessionLabel(sessionInfo) : event.type_;
        return (
          <div key={index} className="card course-events-mobile__item" style={{ borderLeftColor: borderColor }}>
            <div className="course-events-mobile__top">
              <div className="course-events-mobile__meta">
                <div className="course-events-mobile__type-row">
                  <strong className="course-events-mobile__type">{typeLabel}</strong>
                  <span
                    title={promoText}
                    className="course-events-mobile__promo"
                  >
                    {promoText}
                  </span>
                </div>
              </div>
              <span className="course-events-mobile__duration">{event.duration_hours}h</span>
            </div>
            <div className="course-events-mobile__datetime-row">
              <div className="course-events-mobile__datetime">
                {formatDateWithDay(event.start_date)} •
                <span className="course-events-mobile__time-wrap">
                  <span
                    aria-hidden
                    className="course-events-mobile__time-accent"
                    style={{ background: timeAccentColor }}
                  />
                  <span>
                    {formatTime(event.start_date)}-{formatTime(event.end_date)}
                  </span>
                </span>
              </div>
              <button
                className="btn course-events-mobile__raw-btn"
                title={rawEventLabel}
                aria-label={rawEventLabel}
                onClick={() => onOpenEvent(event)}
              >
                ⓘ
              </button>
            </div>
            <div className="course-events-mobile__teachers">{splitTeachers(event.extractedTeacher).join(', ') || '—'}</div>
            <div className="course-events-mobile__location">{event.raw.location || '—'}</div>
          </div>
        );
      })}
    </div>
  );
}
