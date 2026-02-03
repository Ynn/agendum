import { useMemo } from 'react';
import type { NormalizedEvent } from '../types';

interface Props {
    search: string;
    setSearch: (val: string) => void;
    start: string;
    setStart: (val: string) => void;
    end: string;
    setEnd: (val: string) => void;
    dateStart: string;
    setDateStart: (val: string) => void;
    dateEnd: string;
    setDateEnd: (val: string) => void;
    allEvents: NormalizedEvent[]; // Used for suggestions
}

export function FilterBar({
    search, setSearch,
    start, setStart, end, setEnd,
    dateStart, setDateStart, dateEnd, setDateEnd,
    allEvents
}: Props) {

    // Calculate suggestions based on available events
    const suggestions = useMemo(() => {
        const subjects = new Set<string>();
        const limit = 20; // limit suggestions
        for (const ev of allEvents) {
            if (subjects.size >= limit) break;
            if (ev.subject && !subjects.has(ev.subject)) subjects.add(ev.subject);
        }
        return Array.from(subjects).sort();
    }, [allEvents]);

    return (
        <div className="card filter-bar fade-in" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Search with Autocomplete */}
            <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Search Subject / Type</label>
                <div style={{ position: 'relative' }}>
                    <input
                        list="suggestions"
                        type="text"
                        placeholder="e.g. PRORES, CM, TP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius)',
                            fontSize: '1rem'
                        }}
                    />
                    <datalist id="suggestions">
                        {suggestions.map(s => <option key={s} value={s} />)}
                    </datalist>
                </div>
            </div>

            {/* Date Range */}
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date Loop</label>
                <div className="filter-dates" style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        style={{ flex: 1, padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                    />
                    <input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        style={{ flex: 1, padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                    />
                </div>
            </div>

            {/* Time Slot (Nounou) */}
            <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Time Slot (Nounou)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="time"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        style={{ flex: 1, padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                    <input
                        type="time"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        style={{ flex: 1, padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                    />
                </div>
            </div>

            {(search || start || end || dateStart || dateEnd) && (
                <button
                    onClick={() => { setSearch(''); setStart(''); setEnd(''); setDateStart(''); setDateEnd(''); }}
                    className="btn"
                    style={{ height: '42px', marginTop: 'auto', background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}
                >
                    Clear
                </button>
            )}
        </div>
    );
}
