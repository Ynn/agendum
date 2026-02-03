import type { NormalizedEvent } from '../types';
import { useLang, useT } from '../i18n';

interface Props {
    events: NormalizedEvent[];
    query: string;
}

export function SearchResults({ events, query }: Props) {
    if (!query) return null;
    const t = useT();
    const lang = useLang();

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
        <div className="search-results fade-in page-scroll" style={{ padding: '1rem', maxWidth: '100%', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1rem' }}>
                {t.search_results_for} <span style={{ color: 'var(--primary-color)' }}>"{query}"</span>
            </h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>{t.found_events.replace('{count}', String(events.length))}</p>

            {events.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    {t.no_results}
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
                                    <td>{formatDate((ev as any).start_date)}</td>
                                    <td>{formatTime((ev as any).start_date)} - {formatTime((ev as any).end_date)}</td>
                                    <td>{(ev as any).extractedTeacher || t.unknown_teacher}</td>
                                    <td>{ev.raw.location || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: (ev as any).color || '#ccc' }}></div>
                                            {(ev as any).calendarName}
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
