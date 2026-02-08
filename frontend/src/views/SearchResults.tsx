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
        <div className="search-results fade-in page-scroll search-results__shell">
            <h2 className="search-results__title">
                {t.search_results_for} <span className="search-results__query">"{query}"</span>
            </h2>
            <p className="search-results__count">{t.found_events.replace('{count}', String(events.length))}</p>

            {events.length === 0 ? (
                <div className="card search-results__empty">
                    {t.no_results}
                </div>
            ) : isMobile ? (
                <div className="search-results__mobile-list">
                    {events.map((ev, i) => (
                        <div key={i} className="card search-results__mobile-item">
                            <div className="search-results__mobile-head">
                                <div className="search-results__dot" style={{ background: ev.color || '#ccc' }}></div>
                                <div className="search-results__mobile-subject">{ev.subject}</div>
                            </div>
                            <div className="search-results__mobile-grid">
                                <div><strong>{t.type}:</strong> {ev.type_}</div>
                                <div><strong>{t.date}:</strong> {formatDate(ev.start_date)}</div>
                                <div><strong>{t.time}:</strong> {formatTime(ev.start_date)} - {formatTime(ev.end_date)}</div>
                                <div><strong>{t.teacher}:</strong> {ev.extractedTeacher || t.unknown_teacher}</div>
                                <div><strong>{t.location}:</strong> {ev.raw.location || '-'}</div>
                                <div className="search-results__source-line"><strong>{t.calendar_source}:</strong> {ev.calendarName}</div>
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
                                    <td className="search-results__desktop-subject">{ev.subject}</td>
                                    <td>{ev.type_}</td>
                                    <td>{formatDate(ev.start_date)}</td>
                                    <td>{formatTime(ev.start_date)} - {formatTime(ev.end_date)}</td>
                                    <td>{ev.extractedTeacher || t.unknown_teacher}</td>
                                    <td>{ev.raw.location || '-'}</td>
                                    <td>
                                        <div className="search-results__source-wrap">
                                            <div className="search-results__dot" style={{ background: ev.color || '#ccc' }}></div>
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
