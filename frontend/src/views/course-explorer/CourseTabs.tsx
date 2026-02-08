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
  return (
    <div className={`course-tabs ${compact ? 'course-tabs--compact' : ''}`}>
      <button
        className={`btn course-tabs__btn ${compact ? 'course-tabs__btn--compact' : ''} ${tab === 'list' ? 'btn-primary' : ''}`}
        onClick={() => onTabChange('list')}
      >
        📋 {labels.list}
      </button>
      <button
        className={`btn course-tabs__btn ${compact ? 'course-tabs__btn--compact' : ''} ${tab === 'calendar' ? 'btn-primary' : ''}`}
        onClick={() => onTabChange('calendar')}
      >
        📅 {labels.calendar}
      </button>
      <button
        className={`btn course-tabs__btn ${compact ? 'course-tabs__btn--compact' : ''} ${tab === 'teachers' ? 'btn-primary' : ''}`}
        onClick={() => onTabChange('teachers')}
      >
        👥 {labels.byTeacher}
      </button>
      <button
        className={`btn course-tabs__btn ${compact ? 'course-tabs__btn--compact' : ''} ${tab === 'promos' ? 'btn-primary' : ''}`}
        onClick={() => onTabChange('promos')}
      >
        🎓 {labels.byPromo}
      </button>
      <button
        className={`btn course-tabs__btn ${compact ? 'course-tabs__btn--compact' : ''} ${tab === 'rooms' ? 'btn-primary' : ''}`}
        onClick={() => onTabChange('rooms')}
      >
        🏫 {labels.byRoom}
      </button>
    </div>
  );
}
