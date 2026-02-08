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
    <div className="breakdown-cards">
      {entries.map(([name, s]) => (
        <div key={name} className="card breakdown-cards__item">
          <div className="breakdown-cards__title">{name}</div>
          <div className="breakdown-cards__line">
            CM {s.cm.toFixed(1)}h • TD {s.td.toFixed(1)}h • TP {s.tp.toFixed(1)}h • {labels.project} {s.project.toFixed(1)}h • {labels.total} {s.total.toFixed(1)}h • {labels.exam} {s.exam.toFixed(1)}h • {labels.other} {s.other.toFixed(1)}h
          </div>
        </div>
      ))}
    </div>
  );
}
