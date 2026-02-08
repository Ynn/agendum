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
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
      <thead>
        <tr style={{ textAlign: 'left' }}>
          <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{firstColumnLabel}</th>
          <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</th>
          <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</th>
          <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</th>
          <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labels.project}</th>
          <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labels.total}</th>
          <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labels.exam}</th>
          <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labels.other}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([name, s]) => (
          <tr key={name} style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '0.8rem', fontWeight: 600, fontSize: '0.95rem' }}>{name}</td>
            <td style={{ padding: '0.8rem', color: '#1e40af', fontFamily: 'var(--font-mono)' }}>{s.cm.toFixed(1)}h</td>
            <td style={{ padding: '0.8rem', color: '#166534', fontFamily: 'var(--font-mono)' }}>{s.td.toFixed(1)}h</td>
            <td style={{ padding: '0.8rem', color: '#92400e', fontFamily: 'var(--font-mono)' }}>{s.tp.toFixed(1)}h</td>
            <td style={{ padding: '0.8rem', color: '#7c3aed', fontFamily: 'var(--font-mono)' }}>{s.project.toFixed(1)}h</td>
            <td style={{ padding: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.total.toFixed(1)}h</td>
            <td style={{ padding: '0.8rem', color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>{s.exam.toFixed(1)}h</td>
            <td style={{ padding: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.other.toFixed(1)}h</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
