type BreakdownTotals = {
  cm: number;
  td: number;
  tp: number;
  project: number;
  exam: number;
  other: number;
  total: number;
};

type Labels = {
  project: string;
  total: string;
  exam: string;
  other: string;
};

interface Props {
  entries: Array<[string, BreakdownTotals]>;
  labels: Labels;
}

export function BreakdownCards({ entries, labels }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {entries.map(([name, s]) => (
        <div key={name} className="card" style={{ padding: '0.45rem 0.55rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: '0.25rem' }}>{name}</div>
          <div style={{ fontSize: '0.76rem', color: '#475569' }}>
            CM {s.cm.toFixed(1)}h • TD {s.td.toFixed(1)}h • TP {s.tp.toFixed(1)}h • {labels.project} {s.project.toFixed(1)}h • {labels.total} {s.total.toFixed(1)}h • {labels.exam} {s.exam.toFixed(1)}h • {labels.other} {s.other.toFixed(1)}h
          </div>
        </div>
      ))}
    </div>
  );
}
