import { useMemo } from 'react';
import type { NormalizedEvent } from '../types';
import { UiInput } from './ui/UiInput';

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
        <div className="card filter-bar fade-in filter-bar__panel">

            {/* Search with Autocomplete */}
            <div className="filter-bar__group filter-bar__group--search">
                <label className="filter-bar__label">Search Subject / Type</label>
                <div className="filter-bar__field-wrap">
                    <UiInput
                        list="suggestions"
                        type="text"
                        placeholder="e.g. PRORES, CM, TP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="filter-bar__input"
                    />
                    <datalist id="suggestions">
                        {suggestions.map(s => <option key={s} value={s} />)}
                    </datalist>
                </div>
            </div>

            {/* Date Range */}
            <div className="filter-bar__group filter-bar__group--date">
                <label className="filter-bar__label">Date Loop</label>
                <div className="filter-dates filter-bar__inline">
                    <UiInput
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className="filter-bar__inline-input"
                    />
                    <UiInput
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="filter-bar__inline-input"
                    />
                </div>
            </div>

            {/* Time Slot (Nounou) */}
            <div className="filter-bar__group filter-bar__group--time">
                <label className="filter-bar__label">Time Slot (Nounou)</label>
                <div className="filter-bar__inline filter-bar__inline--time">
                    <UiInput
                        type="time"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="filter-bar__inline-input"
                    />
                    <span className="filter-bar__separator">-</span>
                    <UiInput
                        type="time"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className="filter-bar__inline-input"
                    />
                </div>
            </div>

            {(search || start || end || dateStart || dateEnd) && (
                <button
                    onClick={() => { setSearch(''); setStart(''); setEnd(''); setDateStart(''); setDateEnd(''); }}
                    className="btn filter-bar__clear-btn"
                >
                    Clear
                </button>
            )}
        </div>
    );
}
