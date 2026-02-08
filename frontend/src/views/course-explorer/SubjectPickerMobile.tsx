import { getSubjectColor } from '../../utils/colors';
import { UiInput } from '../../components/ui/UiInput';
import { UiSelect } from '../../components/ui/UiSelect';

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
    <div className="card subject-picker-mobile">
      <h3 className="subject-picker-mobile__title">
        <span>📚</span> {labels.title}
      </h3>
      <label className="subject-picker-mobile__label">
        {labels.calendarFilterLabel}
      </label>
      <UiSelect
        value={selectedCalendarId}
        onChange={(e) => onCalendarChange(e.target.value)}
        uiSize="sm"
        className="subject-picker-mobile__select"
      >
        <option value="">{labels.allCalendars}</option>
        {calendarOptions.map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </UiSelect>
      <UiInput
        type="text"
        placeholder={`🔍 ${labels.filterPlaceholder}`}
        uiSize="sm"
        className="subject-picker-mobile__filter"
        value={subjectFilter}
        onChange={(e) => onSubjectFilterChange(e.target.value)}
      />
      <div className="subject-picker-mobile__count">
        {subjects.length} {subjects.length === 1 ? labels.subjectCountSingular : labels.subjectCountPlural}
      </div>
      <div className="subject-picker-mobile__list">
        {subjects.map((subject) => {
          const colors = getSubjectColor(subject);
          return (
            <button
              key={subject}
              className="btn subject-picker-mobile__subject-btn"
              onClick={() => onSubjectSelect(subject)}
              style={{
                borderLeftColor: colors.bg
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
