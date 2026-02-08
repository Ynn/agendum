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
    <div style={{
      display: 'flex',
      gap: size === 'mobile' ? '0.8rem' : '0.9rem',
      flexWrap: 'wrap',
      padding: size === 'mobile' ? '0.45rem 0.55rem' : '0.45rem 0.6rem',
      background: 'var(--card-bg)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-xs)'
    }}>
      <Metric icon="⏱️" label={labels.totalLabel} value={summary.total} color="var(--text-color)" compact={compact} />
      <Metric icon="📖" label="CM" value={summary.cm} color="#1e40af" compact={compact} />
      <Metric icon="✏️" label="TD" value={summary.td} color="#166534" compact={compact} />
      <Metric icon="🔬" label="TP" value={summary.tp} color="#374151" compact={compact} />
      <Metric icon="🧩" label={labels.project} value={summary.project} color="#7c3aed" compact={compact} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: size === 'mobile' ? '0.35rem' : '0.45rem',
          flexWrap: 'wrap',
          marginLeft: size === 'mobile' ? 0 : 'auto',
          width: size === 'mobile' ? '100%' : undefined,
          flexBasis: size === 'mobile' ? '100%' : undefined
        }}
      >
        <span style={{ fontSize: compact ? '0.66rem' : '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
            className={`btn ${scope === opt.key ? 'btn-primary' : ''}`}
            onClick={() => onScopeChange(opt.key)}
            style={{
              fontSize: compact ? '0.66rem' : '0.72rem',
              padding: compact ? '0.16rem 0.34rem' : '0.2rem 0.42rem'
            }}
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
  color,
  compact,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  compact: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <div>
        <div
          style={{
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: compact ? '0.92rem' : '0.95rem', fontWeight: 700, color }}>
          {value.toFixed(1)}h
        </div>
      </div>
    </div>
  );
}
