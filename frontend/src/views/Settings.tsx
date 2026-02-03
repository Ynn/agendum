import { useState } from 'react';
import { CalendarManager } from '../components/CalendarManager';
import { ImportZone } from '../components/ImportZone';
import type { Calendar, NormalizedEvent } from '../types';
import { useT } from '../i18n';

interface Props {
    calendars: Calendar[];
    mainCalendarId: string | null;
    setMainCalendarId: (id: string) => void;
    teacherOptions: { name: string; count: number }[];
    selectedTeacher: string;
    onSelectTeacher: (name: string) => void;
    onOpenFix: () => void;
    onImport: (name: string, events: NormalizedEvent[], isService: boolean) => void;
    onRemove: (id: string) => void;
    onToggle: (id: string) => void;
    onToggleStats: (id: string) => void;
}

export function Settings({
    calendars,
    teacherOptions,
    selectedTeacher,
    onSelectTeacher,
    onOpenFix,
    onImport,
    onRemove,
    onToggle,
    onToggleStats
}: Props) {
    const [showImport, setShowImport] = useState(false);
    const t = useT();

    return (
        <div className="settings-view fade-in page-scroll" style={{ padding: '1rem', maxWidth: '100%', margin: '0 auto', height: '100%' }}>
            <h2 style={{ marginBottom: '2rem' }}>{t.settings_title}</h2>

            <section className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0 }}>{t.teacher_identity}</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {t.teacher_identity_desc}
                </p>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>{t.teacher_select_label}</label>
                <select
                    value={selectedTeacher}
                    onChange={(e) => onSelectTeacher(e.target.value)}
                    style={{ padding: '0.6rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', width: '100%' }}
                >
                    <option value="">{t.teacher_select_none}</option>
                    {teacherOptions.map(opt => (
                        <option key={opt.name} value={opt.name}>
                            {opt.name} ({opt.count})
                        </option>
                    ))}
                </select>
            </section>

            {/* 2. Data Management */}
            <section className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>{t.data_sources}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" onClick={onOpenFix}>
                            {t.fix}
                        </button>
                        <button onClick={() => setShowImport(true)} className="btn btn-primary">
                            {t.import_new_source}
                        </button>
                    </div>
                </div>

                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    {t.data_sources_desc}
                </p>

                <CalendarManager
                    calendars={calendars}
                    onToggle={onToggle}
                    onToggleStats={onToggleStats}
                    onRemove={onRemove}
                    onAdd={() => setShowImport(true)} // Redundant but passed to component
                />
            </section>

            {showImport && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <ImportZone onImport={(n, e, s) => { onImport(n, e, s); setShowImport(false); }} onCancel={() => setShowImport(false)} />
                </div>
            )}
        </div>
    );
}
