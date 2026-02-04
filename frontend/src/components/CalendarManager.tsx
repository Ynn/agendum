import { useState } from 'react';
import type { Calendar } from '../types';
import { useT } from '../i18n';
import { msUntilManualRefreshAllowed } from '../utils/remoteCalendars';

interface Props {
    calendars: Calendar[];
    isMobile?: boolean;
    onToggle: (id: string) => void;
    onToggleStats: (id: string) => void;
    onRemove: (id: string) => void;
    onRefresh: (id: string) => Promise<void>;
    onRename: (id: string, name: string) => void;
    onAdd: () => void;
}

export function CalendarManager({ calendars, isMobile = false, onToggle, onToggleStats, onRemove, onRefresh, onRename, onAdd }: Props) {
    const t = useT();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');

    const startRename = (cal: Calendar) => {
        setEditingId(cal.id);
        setDraftName(cal.name);
    };

    const submitRename = (id: string) => {
        const next = draftName.trim();
        if (next) onRename(id, next);
        setEditingId(null);
    };

    return (
        <div className="card calendar-manager fade-in" style={{ padding: isMobile ? '0.55rem' : '0.75rem', flex: '1 1 300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '0.6rem' : '1rem' }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? '0.86rem' : undefined }}>{t.calendars}</h3>
                <button onClick={onAdd} className="btn btn-primary" style={{ padding: isMobile ? '0.24rem 0.45rem' : '0.4rem 0.8rem', fontSize: isMobile ? '0.72rem' : '0.85rem' }}>
                    + {t.import}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.38rem' : '0.5rem' }}>
                {calendars.length === 0 && <p style={{ color: '#ccc', fontStyle: 'italic' }}>{t.no_calendars_imported}</p>}

                {calendars.map(cal => (
                    <div key={cal.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.8rem',
                        padding: isMobile ? '0.35rem' : '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
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
                            {editingId === cal.id ? (
                                <input
                                    type="text"
                                    value={draftName}
                                    onChange={(e) => setDraftName(e.target.value)}
                                    onBlur={() => submitRename(cal.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') submitRename(cal.id);
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    autoFocus
                                    style={{ width: '100%', fontWeight: 500, padding: '0.2rem 0.35rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            ) : (
                                <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: isMobile ? '0.78rem' : undefined }}>{cal.name}</div>
                            )}

                            {cal.remote?.sourceUrl && (
                                <div style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', color: '#94a3b8', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {cal.remote.sourceUrl}
                                </div>
                            )}
                            {cal.remote?.sourceUrl && (
                                <div style={{ fontSize: isMobile ? '0.64rem' : '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                                    {t.last_sync_prefix} {cal.remote.lastSyncedAt ? new Date(cal.remote.lastSyncedAt).toLocaleString() : t.last_sync_never}
                                    {cal.remote.lastError ? ` • ${t.sync_error}` : ''}
                                </div>
                            )}
                            {/* Stats Toggle */}
                            <label style={{ fontSize: isMobile ? '0.67rem' : '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', marginTop: '0.2rem' }}>
                                <input
                                    type="checkbox"
                                    checked={cal.includeInStats}
                                    onChange={() => onToggleStats(cal.id)}
                                />
                                {t.include_in_service}
                            </label>
                        </div>

                        {cal.remote?.sourceUrl && (
                            <button
                                onClick={() => { void onRefresh(cal.id); }}
                                className="btn"
                                style={{ padding: isMobile ? '0.16rem 0.34rem' : '0.2rem 0.5rem', fontSize: isMobile ? '0.66rem' : '0.75rem' }}
                                disabled={msUntilManualRefreshAllowed(cal.remote.lastManualRefreshAt) > 0}
                                title={
                                    msUntilManualRefreshAllowed(cal.remote.lastManualRefreshAt) > 0
                                        ? t.refresh_wait.replace('{minutes}', `${Math.ceil(msUntilManualRefreshAllowed(cal.remote.lastManualRefreshAt) / 60000)}`)
                                        : t.refresh
                                }
                            >
                                {msUntilManualRefreshAllowed(cal.remote.lastManualRefreshAt) > 0
                                    ? t.refresh_wait.replace('{minutes}', `${Math.ceil(msUntilManualRefreshAllowed(cal.remote.lastManualRefreshAt) / 60000)}`)
                                    : t.refresh}
                            </button>
                        )}

                        <button
                            onClick={() => startRename(cal)}
                            className="btn"
                            style={{ padding: isMobile ? '0.16rem 0.34rem' : '0.2rem 0.5rem', fontSize: isMobile ? '0.66rem' : '0.75rem' }}
                            title={t.rename}
                        >
                            {t.rename}
                        </button>

                        <button
                            onClick={() => onRemove(cal.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: isMobile ? '1rem' : '1.2rem', padding: isMobile ? '0 0.25rem' : '0 0.5rem' }}
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
