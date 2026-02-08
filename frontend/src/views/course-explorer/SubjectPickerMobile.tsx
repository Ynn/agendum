import { getSubjectColor } from '../../utils/colors';

interface Props {
  selectedCalendarId: string;
  calendarOptions: Array<[string, string]>;
  subjectFilter: string;
  subjects: string[];
  labels: {
    title: string;
    calendarFilterLabel: string;
    allCalendars: string;
    filterPlaceholder: string;
    subjectCountSingular: string;
    subjectCountPlural: string;
  };
  onCalendarChange: (value: string) => void;
  onSubjectFilterChange: (value: string) => void;
  onSubjectSelect: (subject: string) => void;
}

export function SubjectPickerMobile({
  selectedCalendarId,
  calendarOptions,
  subjectFilter,
  subjects,
  labels,
  onCalendarChange,
  onSubjectFilterChange,
  onSubjectSelect,
}: Props) {
  return (
    <div className="card" style={{ padding: '0.7rem', minHeight: 0 }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: '0.6rem',
        fontSize: '0.95rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem'
      }}>
        <span>📚</span> {labels.title}
      </h3>
      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
        {labels.calendarFilterLabel}
      </label>
      <select
        value={selectedCalendarId}
        onChange={(e) => onCalendarChange(e.target.value)}
        style={{
          width: '100%',
          padding: '0.45rem',
          marginBottom: '0.6rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-color)',
          background: 'var(--card-bg)',
          color: 'var(--text-color)',
          fontSize: '0.8rem'
        }}
      >
        <option value="">{labels.allCalendars}</option>
        {calendarOptions.map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder={`🔍 ${labels.filterPlaceholder}`}
        style={{
          padding: '0.55rem',
          marginBottom: '0.6rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-color)',
          width: '100%',
          fontSize: '0.85rem',
          outline: 'none'
        }}
        value={subjectFilter}
        onChange={(e) => onSubjectFilterChange(e.target.value)}
      />
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        {subjects.length} {subjects.length === 1 ? labels.subjectCountSingular : labels.subjectCountPlural}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {subjects.map((subject) => {
          const colors = getSubjectColor(subject);
          return (
            <button
              key={subject}
              className="btn"
              onClick={() => onSubjectSelect(subject)}
              style={{
                justifyContent: 'flex-start',
                fontSize: '0.82rem',
                padding: '0.45rem 0.6rem',
                borderLeft: `4px solid ${colors.bg}`,
                background: 'var(--card-bg)'
              }}
            >
              {subject}
            </button>
          );
        })}
      </div>
    </div>
  );
}
