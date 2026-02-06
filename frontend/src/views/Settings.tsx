import { useState } from 'react';
import { CalendarManager } from '../components/CalendarManager';
import { ImportZone } from '../components/ImportZone';
import { QrCodeModal } from '../components/QrCodeModal';
import type { Calendar, NormalizedEvent } from '../types';
import { useT } from '../i18n';

interface Props {
    calendars: Calendar[];
    teacherOptions: { name: string; count: number }[];
    selectedTeacher: string;
    isMobile?: boolean;
    themeMode: 'system' | 'light' | 'dark';
    onSelectTeacher: (name: string) => void;
    onThemeModeChange: (mode: 'system' | 'light' | 'dark') => void;
    onPurgeAll: () => Promise<void>;
    onOpenFix: () => void;
    onImport: (name: string, events: NormalizedEvent[], isService: boolean) => void;
    onImportFromUrl: (url: string, name: string, isService: boolean) => Promise<void>;
    onRemove: (id: string) => void;
    onToggle: (id: string) => void;
    onToggleStats: (id: string) => void;
    onRefreshCalendar: (id: string) => Promise<void>;
    onRenameCalendar: (id: string, name: string) => void;
}

export function Settings({
    calendars,
    teacherOptions,
    selectedTeacher,
    isMobile = false,
    themeMode,
    onSelectTeacher,
    onThemeModeChange,
    onPurgeAll,
    onOpenFix,
    onImport,
    onImportFromUrl,
    onRemove,
    onToggle,
    onToggleStats,
    onRefreshCalendar,
    onRenameCalendar
}: Props) {
    const [showImport, setShowImport] = useState(false);
    const [qrValue, setQrValue] = useState<string | null>(null);
    const t = useT();

    return (
        <div className="settings-view fade-in page-scroll" style={{ padding: isMobile ? '0.55rem' : '1rem', maxWidth: '100%', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: isMobile ? '0.9rem' : '2rem', fontSize: isMobile ? '1rem' : undefined }}>{t.settings_title}</h2>

            <section className="card" style={{ padding: isMobile ? '0.8rem' : '1.5rem', marginBottom: isMobile ? '0.7rem' : '2rem' }}>
                <h3 style={{ marginTop: 0, fontSize: isMobile ? '0.92rem' : undefined }}>{t.teacher_identity}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.76rem' : '0.9rem', marginBottom: isMobile ? '0.6rem' : '1rem' }}>
                    {t.teacher_identity_desc}
                </p>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: isMobile ? '0.8rem' : undefined }}>{t.teacher_select_label}</label>
                <select
                    value={selectedTeacher}
                    onChange={(e) => onSelectTeacher(e.target.value)}
                    style={{
                        padding: isMobile ? '0.4rem 0.5rem' : '0.6rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border-color)',
                        width: '100%',
                        fontSize: isMobile ? '0.8rem' : undefined
                    }}
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
            <section className="card" style={{ padding: isMobile ? '0.8rem' : '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '0.6rem' : '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '0.92rem' : undefined }}>{t.data_sources}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" onClick={onOpenFix} style={{ fontSize: isMobile ? '0.74rem' : undefined, padding: isMobile ? '0.2rem 0.45rem' : undefined }}>
                            {t.fix}
                        </button>
                        <button onClick={() => setShowImport(true)} className="btn btn-primary" style={{ fontSize: isMobile ? '0.74rem' : undefined, padding: isMobile ? '0.2rem 0.45rem' : undefined }}>
                            {t.import_new_source}
                        </button>
                    </div>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.76rem' : '0.9rem', marginBottom: isMobile ? '0.8rem' : '1.5rem' }}>
                    {t.data_sources_desc}
                </p>

                <CalendarManager
                    calendars={calendars}
                    isMobile={isMobile}
                    onToggle={onToggle}
                    onToggleStats={onToggleStats}
                    onRemove={onRemove}
                    onRefresh={onRefreshCalendar}
                    onRename={onRenameCalendar}
                    onShowQr={setQrValue}
                />
            </section>

            <section className="card" style={{ padding: isMobile ? '0.8rem' : '1.5rem', marginTop: '0.7rem' }}>
                <h3 style={{ marginTop: 0, fontSize: isMobile ? '0.92rem' : undefined }}>{t.data_and_privacy}</h3>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: isMobile ? '0.8rem' : undefined }}>{t.theme}</label>
                        <select
                            value={themeMode}
                            onChange={(e) => onThemeModeChange(e.target.value as 'system' | 'light' | 'dark')}
                            style={{
                                padding: isMobile ? '0.4rem 0.5rem' : '0.6rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border-color)',
                                width: '100%',
                                fontSize: isMobile ? '0.8rem' : undefined
                            }}
                        >
                            <option value="system">{t.theme_system}</option>
                            <option value="light">{t.theme_light}</option>
                            <option value="dark">{t.theme_dark}</option>
                        </select>
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.76rem' : '0.9rem', marginBottom: '0.5rem' }}>
                            {t.purge_all_desc}
                        </p>
                        <button
                            className="btn"
                            style={{
                                borderColor: '#ef4444',
                                color: '#ef4444',
                                fontSize: isMobile ? '0.74rem' : undefined,
                                padding: isMobile ? '0.2rem 0.45rem' : undefined
                            }}
                            onClick={() => { void onPurgeAll(); }}
                        >
                            {t.purge_all}
                        </button>
                    </div>
                </div>
            </section>

            {showImport && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <ImportZone
                        isMobile={isMobile}
                        onImport={(n, e, s) => { onImport(n, e, s); setShowImport(false); }}
                        onImportFromUrl={async (url, name, isService) => {
                            await onImportFromUrl(url, name, isService);
                            setShowImport(false);
                        }}
                        onCancel={() => setShowImport(false)}
                    />
                </div>
            )}

            <QrCodeModal value={qrValue} onClose={() => setQrValue(null)} />
        </div>
    );
}
