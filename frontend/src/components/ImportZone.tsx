import { useRef, useState } from 'react';
import { parse_and_normalize } from '../pkg/agendum_core';
import type { NormalizedEvent } from '../types';
import { useT } from '../i18n';

interface Props {
    onImport: (name: string, events: NormalizedEvent[], isService: boolean) => void;
    onCancel: () => void;
}

export function ImportZone({ onImport, onCancel }: Props) {
    const [active, setActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [type, setType] = useState<'teacher' | 'resource'>('teacher');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const t = useT();

    const processFile = (file: File) => {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                // Parse + normalize using WASM for consistent typing and durations
                const events = parse_and_normalize(text);
                const name = file.name.replace('.ics', '');
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
            background: 'white',
            padding: '2rem',
            borderRadius: 'var(--radius)',
            maxWidth: '500px',
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

            <h3 style={{ marginTop: 0 }}>{t.import_calendar}</h3>

            {/* Type Selection */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0' }}>
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
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.teacher_schedule_desc}</div>
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
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t.resource_promo_desc}</div>
                        </div>
                    </label>
                </div>
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    border: active ? '2px solid #3b82f6' : '2px dashed #94a3b8',
                    background: active ? '#eff6ff' : '#f8fafc',
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
                <p style={{ margin: 0, color: '#64748b' }}>
                    {loading ? t.parsing : t.drag_drop}
                </p>
            </div>

            <button
                onClick={onCancel}
                style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}
            >
                {t.cancel}
            </button>
        </div>
    );
}
