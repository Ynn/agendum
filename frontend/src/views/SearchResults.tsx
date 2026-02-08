import type { EnrichedEvent } from '../types';
import { useLang, useT } from '../i18n';

interface Props {
    events: EnrichedEvent[];
    query: string;
    isMobile?: boolean;
}

export function SearchResults({ events, query, isMobile = false }: Props) {
    const t = useT();
    const lang = useLang();
    if (!query) return null;

    const formatDate = (d?: Date) => {
        if (!d) return '—';
        return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
    };

    const formatTime = (d?: Date) => {
        if (!d) return '—';
        return d.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="search-results fade-in page-scroll" style={{ padding: '1rem', maxWidth: '100%', margin: '0 auto', height: '100%', minHeight: 0, overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1rem' }}>
                {t.search_results_for} <span style={{ color: 'var(--primary-color)' }}>"{query}"</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{t.found_events.replace('{count}', String(events.length))}</p>

            {events.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
                    {t.no_results}
                </div>
            ) : isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {events.map((ev, i) => (
                        <div key={i} className="card" style={{ padding: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.color || '#ccc', flexShrink: 0 }}></div>
                                <div style={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2 }}>{ev.subject}</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#334155', display: 'grid', gap: '0.25rem' }}>
                                <div><strong>{t.type}:</strong> {ev.type_}</div>
                                <div><strong>{t.date}:</strong> {formatDate(ev.start_date)}</div>
                                <div><strong>{t.time}:</strong> {formatTime(ev.start_date)} - {formatTime(ev.end_date)}</div>
                                <div><strong>{t.teacher}:</strong> {ev.extractedTeacher || t.unknown_teacher}</div>
                                <div><strong>{t.location}:</strong> {ev.raw.location || '-'}</div>
                                <div style={{ color: 'var(--text-muted)' }}><strong>{t.calendar_source}:</strong> {ev.calendarName}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>{t.subject}</th>
                                <th>{t.type}</th>
                                <th>{t.date}</th>
                                <th>{t.time}</th>
                                <th>{t.teacher}</th>
                                <th>{t.location}</th>
                                <th>{t.calendar_source}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((ev, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600 }}>{ev.subject}</td>
                                    <td>{ev.type_}</td>
                                    <td>{formatDate(ev.start_date)}</td>
                                    <td>{formatTime(ev.start_date)} - {formatTime(ev.end_date)}</td>
                                    <td>{ev.extractedTeacher || t.unknown_teacher}</td>
                                    <td>{ev.raw.location || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.color || '#ccc' }}></div>
                                            {ev.calendarName}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
