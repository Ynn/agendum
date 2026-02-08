import type { EnrichedEvent } from '../../types';

interface Props {
  events: EnrichedEvent[];
  subjectColor: string;
  rawEventLabel: string;
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
  formatDateWithDay,
  formatTime,
  splitTeachers,
  getListBorderColor,
  getTimeAccentColor,
  onOpenEvent,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {events.map((event, index) => {
        const promoText = event.promo || '—';
        const borderColor = getListBorderColor(event, subjectColor);
        const timeAccentColor = getTimeAccentColor(event.start_date);
        return (
          <div key={index} className="card" style={{ padding: '0.5rem', borderLeft: `4px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: '0.82rem', flexShrink: 0 }}>{event.type_}</strong>
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
                  onClick={() => onOpenEvent(event)}
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
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', flexShrink: 0 }}>{event.duration_hours}h</span>
            </div>
            <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
              {formatDateWithDay(event.start_date)} •
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
                  {formatTime(event.start_date)}-{formatTime(event.end_date)}
                </span>
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', marginTop: '0.18rem' }}>{splitTeachers(event.extractedTeacher).join(', ') || '—'}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{event.raw.location || '—'}</div>
          </div>
        );
      })}
    </div>
  );
}
