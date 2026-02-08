import { getSubjectColor, getSubjectColorLight } from '../../utils/colors';

interface Props {
  isTablet: boolean;
  selectedCalendarId: string;
  calendarOptions: Array<[string, string]>;
  subjectFilter: string;
  subjects: string[];
  selectedSubject: string;
  labels: {
    title: string;
    calendarFilterLabel: string;
    allCalendars: string;
    filterPlaceholder: string;
  };
  onCalendarChange: (value: string) => void;
  onSubjectFilterChange: (value: string) => void;
  onSubjectSelect: (subject: string) => void;
}

export function SubjectSidebarDesktop({
  isTablet,
  selectedCalendarId,
  calendarOptions,
  subjectFilter,
  subjects,
  selectedSubject,
  labels,
  onCalendarChange,
  onSubjectFilterChange,
  onSubjectSelect,
}: Props) {
  return (
    <div className="card" style={{
      width: isTablet ? '248px' : '320px',
      display: 'flex',
      flexDirection: 'column',
      padding: isTablet ? '0.7rem' : '1rem',
      height: '100%',
      minHeight: 0,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)'
    }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: isTablet ? '0.65rem' : '1rem',
        fontSize: isTablet ? '0.92rem' : '1.1rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span>📚</span> {labels.title}
      </h3>
      <label style={{ display: 'block', fontSize: isTablet ? '0.7rem' : '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
        {labels.calendarFilterLabel}
      </label>
      <select
        value={selectedCalendarId}
        onChange={(e) => onCalendarChange(e.target.value)}
        style={{
          width: '100%',
          padding: isTablet ? '0.5rem' : '0.65rem',
          marginBottom: isTablet ? '0.6rem' : '0.85rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-color)',
          background: 'var(--card-bg)',
          color: 'var(--text-color)',
          fontSize: isTablet ? '0.78rem' : '0.85rem'
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
          padding: isTablet ? '0.52rem' : '0.75rem',
          marginBottom: isTablet ? '0.7rem' : '1rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-color)',
          width: '100%',
          fontSize: isTablet ? '0.8rem' : '0.9rem',
          transition: 'all var(--transition-base)',
          outline: 'none'
        }}
        value={subjectFilter}
        onChange={(e) => onSubjectFilterChange(e.target.value)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-focus)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      <div style={{
        fontSize: isTablet ? '0.66rem' : '0.75rem',
        color: 'var(--text-muted)',
        marginBottom: isTablet ? '0.5rem' : '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 600
      }}>
        {subjects.length} {subjects.length === 1 ? 'matière' : 'matières'}
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isTablet ? '0.36rem' : '0.5rem',
        minHeight: 0,
        paddingRight: '0.25rem'
      }}>
        {subjects.map((subject) => {
          const colors = getSubjectColor(subject);
          const isSelected = selectedSubject === subject;
          return (
            <div
              key={subject}
              onClick={() => onSubjectSelect(subject)}
              style={{
                padding: isTablet ? '0.55rem' : '0.75rem',
                cursor: 'pointer',
                borderRadius: 'var(--radius)',
                background: isSelected ? colors.bg : 'transparent',
                color: isSelected ? colors.text : 'var(--text-color)',
                fontWeight: isSelected ? 600 : 500,
                fontSize: isTablet ? '0.78rem' : '0.9rem',
                transition: 'all var(--transition-base)',
                border: `2px solid ${isSelected ? colors.bg : 'transparent'}`,
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                transform: isSelected ? 'translateX(4px)' : 'none',
                position: 'relative',
                paddingLeft: '1rem'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = getSubjectColorLight(subject);
                  e.currentTarget.style.borderColor = colors.bg;
                  e.currentTarget.style.transform = 'translateX(2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              <div style={{
                position: 'absolute',
                left: '0.25rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '4px',
                height: isSelected ? '60%' : '0%',
                background: isSelected ? colors.text : colors.bg,
                borderRadius: 'var(--radius-full)',
                transition: 'height var(--transition-base)'
              }} />
              {subject}
            </div>
          );
        })}
      </div>
    </div>
  );
}
