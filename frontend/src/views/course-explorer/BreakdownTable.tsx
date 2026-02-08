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
  firstColumnLabel: string;
  entries: Array<[string, BreakdownTotals]>;
  labels: Labels;
}

export function BreakdownTable({ firstColumnLabel, entries, labels }: Props) {
  return (
    <table className="breakdown-table">
      <thead>
        <tr className="breakdown-table__head-row">
          <th className="breakdown-table__head">{firstColumnLabel}</th>
          <th className="breakdown-table__head">CM</th>
          <th className="breakdown-table__head">TD</th>
          <th className="breakdown-table__head">TP</th>
          <th className="breakdown-table__head">{labels.project}</th>
          <th className="breakdown-table__head">{labels.total}</th>
          <th className="breakdown-table__head">{labels.exam}</th>
          <th className="breakdown-table__head">{labels.other}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([name, s]) => (
          <tr key={name} className="breakdown-table__row">
            <td className="breakdown-table__cell breakdown-table__cell--name">{name}</td>
            <td className="breakdown-table__cell breakdown-table__cell--cm">{s.cm.toFixed(1)}h</td>
            <td className="breakdown-table__cell breakdown-table__cell--td">{s.td.toFixed(1)}h</td>
            <td className="breakdown-table__cell breakdown-table__cell--tp">{s.tp.toFixed(1)}h</td>
            <td className="breakdown-table__cell breakdown-table__cell--project">{s.project.toFixed(1)}h</td>
            <td className="breakdown-table__cell breakdown-table__cell--total">{s.total.toFixed(1)}h</td>
            <td className="breakdown-table__cell breakdown-table__cell--exam">{s.exam.toFixed(1)}h</td>
            <td className="breakdown-table__cell breakdown-table__cell--other">{s.other.toFixed(1)}h</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
