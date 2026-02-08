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
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 10 }}>
          <tr style={{ textAlign: 'left' }}>
            <th style={headerStyle}>{labels.type}</th>
            <th style={headerStyle}>{labels.date}</th>
            <th style={headerStyle}>{labels.time}</th>
            <th style={headerStyle}>{labels.teacher}</th>
            <th style={headerStyle}>{labels.promo}</th>
            <th style={headerStyle}>{labels.location}</th>
            <th style={headerStyle}>{labels.duration}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => {
            const borderColor = getListBorderColor(event, subjectColor);
            const timeAccentColor = getTimeAccentColor(event.start_date);
            return (
              <tr
                key={index}
                style={{ borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-color)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '0.75rem', borderLeft: `4px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: event.type_.toUpperCase().includes('CM') ? '#dbeafe'
                        : event.type_.toUpperCase().includes('TD') ? '#dcfce7'
                          : event.type_.toUpperCase().includes('TP') ? '#fef3c7' : '#f3f4f6',
                      color: event.type_.toUpperCase().includes('CM') ? '#1e40af'
                        : event.type_.toUpperCase().includes('TD') ? '#166534'
                          : event.type_.toUpperCase().includes('TP') ? '#92400e' : '#374151',
                      display: 'inline-block'
                    }}>
                      {event.type_}
                    </span>
                    <button
                      className="btn"
                      title={rawEventLabel}
                      aria-label={rawEventLabel}
                      onClick={() => onOpenEvent(event)}
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
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{formatDateWithDay(event.start_date)}</td>
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
                      {formatTime(event.start_date)} - {formatTime(event.end_date)}
                    </span>
                  </span>
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 600 }}>
                  {splitTeachers(event.extractedTeacher).join(', ') || '—'}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div
                    title={event.promo || '—'}
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
                    {event.promo || '—'}
                  </div>
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {event.raw.location || '—'}
                </td>
                <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{event.duration_hours}h</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const headerStyle = {
  padding: '0.75rem',
  borderBottom: '2px solid var(--border-color)',
  fontWeight: 600,
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
