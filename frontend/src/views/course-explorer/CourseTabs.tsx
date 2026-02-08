export type CourseTab = 'list' | 'calendar' | 'teachers' | 'promos' | 'rooms';

interface Labels {
  list: string;
  calendar: string;
  byTeacher: string;
  byPromo: string;
  byRoom: string;
}

interface Props {
  tab: CourseTab;
  compact: boolean;
  labels: Labels;
  onTabChange: (tab: CourseTab) => void;
}

export function CourseTabs({ tab, compact, labels, onTabChange }: Props) {
  const fontSize = compact ? '0.74rem' : '0.75rem';
  const padding = compact ? '0.2rem 0.4rem' : '0.2rem 0.45rem';
  const gap = compact ? '0.35rem' : '0.5rem';

  return (
    <div className="tabs" style={{ display: 'flex', gap }}>
      <button className={`btn ${tab === 'list' ? 'btn-primary' : ''}`} onClick={() => onTabChange('list')} style={{ fontSize, padding }}>
        📋 {labels.list}
      </button>
      <button className={`btn ${tab === 'calendar' ? 'btn-primary' : ''}`} onClick={() => onTabChange('calendar')} style={{ fontSize, padding }}>
        📅 {labels.calendar}
      </button>
      <button className={`btn ${tab === 'teachers' ? 'btn-primary' : ''}`} onClick={() => onTabChange('teachers')} style={{ fontSize, padding }}>
        👥 {labels.byTeacher}
      </button>
      <button className={`btn ${tab === 'promos' ? 'btn-primary' : ''}`} onClick={() => onTabChange('promos')} style={{ fontSize, padding }}>
        🎓 {labels.byPromo}
      </button>
      <button className={`btn ${tab === 'rooms' ? 'btn-primary' : ''}`} onClick={() => onTabChange('rooms')} style={{ fontSize, padding }}>
        🏫 {labels.byRoom}
      </button>
    </div>
  );
}
