import type { CSSProperties } from 'react';
import { getSubjectColor, getSubjectColorLight } from '../../utils/colors';
import { UiInput } from '../../components/ui/UiInput';
import { UiSelect } from '../../components/ui/UiSelect';

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
    <div className={`card subject-sidebar ${isTablet ? 'subject-sidebar--tablet' : ''}`}>
      <h3 className={`subject-sidebar__title ${isTablet ? 'subject-sidebar__title--tablet' : ''}`}>
        <span>📚</span> {labels.title}
      </h3>
      <label className={`subject-sidebar__label ${isTablet ? 'subject-sidebar__label--tablet' : ''}`}>
        {labels.calendarFilterLabel}
      </label>
      <UiSelect
        value={selectedCalendarId}
        onChange={(e) => onCalendarChange(e.target.value)}
        uiSize={isTablet ? 'sm' : 'md'}
        className={`subject-sidebar__select ${isTablet ? 'subject-sidebar__select--tablet' : ''}`}
      >
        <option value="">{labels.allCalendars}</option>
        {calendarOptions.map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </UiSelect>
      <UiInput
        type="text"
        placeholder={`🔍 ${labels.filterPlaceholder}`}
        uiSize={isTablet ? 'sm' : 'md'}
        className={`subject-sidebar__filter ${isTablet ? 'subject-sidebar__filter--tablet' : ''}`}
        value={subjectFilter}
        onChange={(e) => onSubjectFilterChange(e.target.value)}
      />
      <div className={`subject-sidebar__count ${isTablet ? 'subject-sidebar__count--tablet' : ''}`}>
        {subjects.length} {subjects.length === 1 ? 'matière' : 'matières'}
      </div>
      <div className={`subject-sidebar__list ${isTablet ? 'subject-sidebar__list--tablet' : ''}`}>
        {subjects.map((subject) => {
          const colors = getSubjectColor(subject);
          const isSelected = selectedSubject === subject;
          return (
            <div
              key={subject}
              onClick={() => onSubjectSelect(subject)}
              className={`subject-sidebar__item ${isTablet ? 'subject-sidebar__item--tablet' : ''} ${isSelected ? 'subject-sidebar__item--selected' : ''}`}
              style={{
                '--subject-color': colors.bg,
                '--subject-color-light': getSubjectColorLight(subject),
                '--subject-color-text': colors.text,
              } as CSSProperties}
            >
              <div className="subject-sidebar__item-accent" />
              {subject}
            </div>
          );
        })}
      </div>
    </div>
  );
}
