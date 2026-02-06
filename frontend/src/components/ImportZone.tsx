import { useRef, useState } from 'react';
import { parse_and_normalize } from '../pkg/agendum_core';
import type { NormalizedEvent } from '../types';
import { useT } from '../i18n';
import { QrScannerModal } from './QrScannerModal';

interface Props {
    isMobile?: boolean;
    onImport: (name: string, events: NormalizedEvent[], isService: boolean) => void;
    onImportFromUrl: (url: string, name: string, isService: boolean) => Promise<void>;
    onCancel: () => void;
}

export function ImportZone({ isMobile = false, onImport, onImportFromUrl, onCancel }: Props) {
    const [active, setActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [type, setType] = useState<'teacher' | 'resource'>('teacher');
    const [sourceMode, setSourceMode] = useState<'file' | 'url'>('file');
    const [calendarUrl, setCalendarUrl] = useState('');
    const [calendarName, setCalendarName] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const t = useT();

    const isIcsFile = (file: File) => file.name.toLowerCase().endsWith('.ics');

    const processFile = (file: File) => {
        if (!isIcsFile(file)) {
            setError(t.error_only_ics);
            return;
        }
        setLoading(true);
        setError(null);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                // Parse + normalize using WASM for consistent typing and durations
                const events = parse_and_normalize(text);
                const name = calendarName.trim() || file.name.replace('.ics', '');
                onImport(name, events, type === 'teacher'); // Pass stats flag
            } catch (err) {
                console.error(err);
                setError(t.error_parse);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const importFromUrl = async () => {
        if (!calendarUrl.trim()) {
            setError(t.error_parse);
            return;
        }
        try {
            new URL(calendarUrl.trim());
        } catch {
            setError(t.qr_invalid_url);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const name = calendarName.trim();
            await onImportFromUrl(calendarUrl.trim(), name, type === 'teacher');
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : t.error_parse);
        } finally {
            setLoading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setActive(true);
    };

    const handleDragLeave = () => setActive(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="card" style={{
            background: 'var(--card-bg)',
            padding: isMobile ? '0.9rem' : '2rem',
            borderRadius: 'var(--radius)',
            maxWidth: isMobile ? '94vw' : '500px',
            margin: '0 auto',
            textAlign: 'center'
        }}>
            {/* Error Banner */}
            {error && (
                <div style={{
                    background: '#fef2f2', color: '#b91c1c', padding: '0.75rem',
                    borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem',
                    border: '1px solid #fecaca',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    textAlign: 'left'
                }}>
                    <div>
                        <strong>{t.error_label}:</strong> {error}
                        <br />
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                            {t.error_parse_desc}
                        </span>
                    </div>
                    <button onClick={() => setError(null)} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '1.2rem' }}>✕</button>
                </div>
            )}

            <h3 style={{ marginTop: 0, fontSize: isMobile ? '0.95rem' : undefined }}>{t.import_calendar}</h3>

            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: isMobile ? '0.78rem' : '0.9rem' }}>
                    {t.calendar_name_label}
                </label>
                <input
                    type="text"
                    value={calendarName}
                    onChange={(e) => setCalendarName(e.target.value)}
                    placeholder={t.calendar_name_placeholder}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: isMobile ? '0.45rem' : '0.6rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: isMobile ? '0.78rem' : undefined
                    }}
                />
            </div>

            {/* Type Selection */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'left', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                <div style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>{t.calendar_type}:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="calType"
                            checked={type === 'teacher'}
                            onChange={() => setType('teacher')}
                            style={{ marginTop: '0.2rem' }}
                        />
                        <div>
                            <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{t.teacher_schedule}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.teacher_schedule_desc}</div>
                        </div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="calType"
                            checked={type === 'resource'}
                            onChange={() => setType('resource')}
                            style={{ marginTop: '0.2rem' }}
                        />
                        <div>
                            <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{t.resource_promo}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.resource_promo_desc}</div>
                        </div>
                    </label>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    className={`btn ${sourceMode === 'file' ? 'btn-primary' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => setSourceMode('file')}
                    disabled={loading}
                >
                    {t.source_file}
                </button>
                <button
                    className={`btn ${sourceMode === 'url' ? 'btn-primary' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => setSourceMode('url')}
                    disabled={loading}
                >
                    {t.source_url}
                </button>
            </div>

            {sourceMode === 'file' && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                        border: active ? '2px solid #3b82f6' : '2px dashed #94a3b8',
                        background: active ? 'var(--primary-light)' : 'var(--bg-secondary)',
                        borderRadius: 'var(--radius)',
                        padding: '3rem 1rem',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files && processFile(e.target.files[0])}
                        hidden
                        accept=".ics"
                    />
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                        {loading ? t.parsing : t.drag_drop}
                    </p>
                </div>
            )}

            {sourceMode === 'url' && (
                <div style={{
                    border: '1px solid #e2e8f0',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)',
                    padding: '1rem',
                    textAlign: 'left'
                }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                        {t.calendar_url_label}
                    </label>
                    <input
                        type="url"
                        value={calendarUrl}
                        onChange={(e) => setCalendarUrl(e.target.value)}
                        placeholder={t.calendar_url_placeholder}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            marginBottom: '0.75rem'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => { void importFromUrl(); }}
                            disabled={loading || !calendarUrl.trim()}
                        >
                            {loading ? t.parsing : t.import_url}
                        </button>
                        <button
                            className="btn"
                            onClick={() => setShowScanner(true)}
                            disabled={loading}
                        >
                            {t.scan_qr}
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={onCancel}
                style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}
            >
                {t.cancel}
            </button>

            <QrScannerModal
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onDetected={(raw) => {
                    try {
                        const parsed = new URL(raw.trim());
                        setCalendarUrl(parsed.toString());
                        setSourceMode('url');
                        setError(null);
                        setShowScanner(false);
                    } catch {
                        setError(t.qr_invalid_url);
                        setShowScanner(false);
                    }
                }}
            />
        </div>
    );
}
