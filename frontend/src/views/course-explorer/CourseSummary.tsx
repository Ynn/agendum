type BreakdownScope = 'total' | 'done' | 'todo';

type Totals = {
  cm: number;
  td: number;
  tp: number;
  project: number;
  exam: number;
  other: number;
  total: number;
};

type Labels = {
  totalLabel: string;
  project: string;
  servicePeriodLabel: string;
  servicePeriodTotal: string;
  servicePeriodDone: string;
  servicePeriodTodo: string;
};

interface Props {
  size: 'mobile' | 'tablet' | 'desktop';
  summary: Totals;
  scope: BreakdownScope;
  onScopeChange: (scope: BreakdownScope) => void;
  labels: Labels;
}

export function CourseSummary({
  size,
  summary,
  scope,
  onScopeChange,
  labels,
}: Props) {
  const compact = size !== 'desktop';

  return (
    <div className={`course-summary course-summary--${size}`}>
      <Metric icon="⏱️" label={labels.totalLabel} value={summary.total} tone="default" compact={compact} />
      <Metric icon="📖" label="CM" value={summary.cm} tone="cm" compact={compact} />
      <Metric icon="✏️" label="TD" value={summary.td} tone="td" compact={compact} />
      <Metric icon="🔬" label="TP" value={summary.tp} tone="tp" compact={compact} />
      <Metric icon="🧩" label={labels.project} value={summary.project} tone="project" compact={compact} />

      <div
        className={`course-summary__scope ${compact ? 'course-summary__scope--compact' : ''} ${size === 'mobile' ? 'course-summary__scope--mobile' : ''}`}
      >
        <span className={`course-summary__scope-label ${compact ? 'course-summary__scope-label--compact' : ''}`}>
          {labels.servicePeriodLabel}
        </span>
        {([
          { key: 'total', label: labels.servicePeriodTotal },
          { key: 'done', label: labels.servicePeriodDone },
          { key: 'todo', label: labels.servicePeriodTodo }
        ] as const).map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`btn course-summary__scope-btn ${compact ? 'course-summary__scope-btn--compact' : ''} ${scope === opt.key ? 'btn-primary' : ''}`}
            onClick={() => onScopeChange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
  compact,
}: {
  icon: string;
  label: string;
  value: number;
  tone: 'default' | 'cm' | 'td' | 'tp' | 'project';
  compact: boolean;
}) {
  return (
    <div className="course-summary__metric">
      <span className="course-summary__metric-icon">{icon}</span>
      <div>
        <div className="course-summary__metric-label">
          {label}
        </div>
        <div className={`course-summary__metric-value ${compact ? 'course-summary__metric-value--compact' : ''} course-summary__metric-value--${tone}`}>
          {value.toFixed(1)}h
        </div>
      </div>
    </div>
  );
}
