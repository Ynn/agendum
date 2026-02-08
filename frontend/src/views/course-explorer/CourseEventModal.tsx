import type { EnrichedEvent } from '../../types';

interface Props {
  event: EnrichedEvent | null;
  onClose: () => void;
  labels: {
    time: string;
    location: string;
    duration: string;
    unknown: string;
  };
  formatDateWithDay: (d?: Date) => string;
  formatTime: (d?: Date) => string;
}

export function CourseEventModal({
  event,
  onClose,
  labels,
  formatDateWithDay,
  formatTime,
}: Props) {
  if (!event) return null;

  const start = event.start_date;
  const end = event.end_date;
  const title = event.raw.summary?.trim()
    || `${event.type_} ${event.subject || ''}`.trim()
    || labels.unknown;

  return (
    <div className="event-modal-overlay">
      <div className="event-modal-backdrop" onClick={onClose} />
      <div className="card event-modal">
        <div className="event-modal-header">
          <div className="event-modal-title">{title}</div>
          <button className="btn event-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="event-modal-grid">
          <div><strong>{labels.time}:</strong> {formatDateWithDay(start)} • {formatTime(start)} - {formatTime(end)}</div>
          <div><strong>{labels.location}:</strong> {event.raw.location || '—'}</div>
          <div><strong>{labels.duration}:</strong> {event.duration_hours}h</div>
        </div>
        <div className="event-modal-description">
          {event.raw.description || '—'}
        </div>
      </div>
    </div>
  );
}
