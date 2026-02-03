import type { Calendar } from '../types';
import { useT } from '../i18n';

interface Props {
    calendars: Calendar[];
    onToggle: (id: string) => void;
    onToggleStats: (id: string) => void;
    onRemove: (id: string) => void;
    onAdd: () => void;
}

export function CalendarManager({ calendars, onToggle, onToggleStats, onRemove, onAdd }: Props) {
    const t = useT();
    return (
        <div className="card calendar-manager fade-in" style={{ padding: '0.75rem', flex: '1 1 300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>{t.calendars}</h3>
                <button onClick={onAdd} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    + {t.import}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {calendars.length === 0 && <p style={{ color: '#ccc', fontStyle: 'italic' }}>{t.no_calendars_imported}</p>}

                {calendars.map(cal => (
                    <div key={cal.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.8rem',
                        padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
                        background: 'white'
                    }}>
                        {/* Visibility Toggle */}
                        <div
                            onClick={() => onToggle(cal.id)}
                            style={{
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: cal.visible ? cal.color : 'transparent',
                                border: `2px solid ${cal.color}`, cursor: 'pointer',
                                flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Toggle Visibility"
                        >
                            {/* Visual indicator handled by background, maybe add checkmark or dot if desired */}
                        </div>

                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cal.name}</div>
                            {/* Stats Toggle */}
                            <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', marginTop: '0.2rem' }}>
                                <input
                                    type="checkbox"
                                    checked={cal.includeInStats}
                                    onChange={() => onToggleStats(cal.id)}
                                />
                                {t.include_in_service}
                            </label>
                        </div>

                        <button
                            onClick={() => onRemove(cal.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                            title="Remove"
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
