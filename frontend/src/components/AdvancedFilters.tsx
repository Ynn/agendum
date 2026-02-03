import { useState, useEffect } from 'react';
import { useLang, useT } from '../i18n';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    currentFilters: FilterState;
}

export interface FilterState {
    dateStart: string;
    dateEnd: string;
    startTime: string;
    endTime: string;
    days: number[]; // 1=Mon, 7=Sun
    source: 'service' | 'main' | 'visible' | 'all';
}

export const initialFilters: FilterState = {
    dateStart: '',
    dateEnd: '',
    startTime: '',
    endTime: '',
    days: [1, 2, 3, 4, 5, 6, 7],
    source: 'service'
};

export function AdvancedFilters({ isOpen, onClose, onApply, currentFilters }: Props) {
    const [local, setLocal] = useState<FilterState>(currentFilters);
    const lang = useLang();
    const t = useT();

    useEffect(() => {
        if (isOpen) setLocal(currentFilters);
    }, [isOpen, currentFilters]);

    if (!isOpen) return null;

    const toggleDay = (d: number) => {
        const exists = local.days.includes(d);
        setLocal(prev => ({
            ...prev,
            days: exists ? prev.days.filter(x => x !== d) : [...prev.days, d]
        }));
    };

    const handleApply = () => {
        onApply(local);
        onClose();
    };

    const handleReset = () => {
        const reset = { ...initialFilters };
        setLocal(reset);
        onApply(reset);
        onClose();
    };

    return (
        <div className="filters-overlay">
            <div className="filters-backdrop" onClick={onClose} />
            <div className="card filters-panel fade-in">
                <div className="filters-header">
                    <h3 style={{ margin: 0 }}>{t.filters_title}</h3>
                    <button onClick={onClose} className="filters-close">×</button>
                </div>

                <div className="filters-section">
                    <label className="filters-label">{t.source}</label>
                    <div className="filters-grid filters-grid-single">
                        <select
                            value={local.source}
                            onChange={e => setLocal({ ...local, source: e.target.value as FilterState['source'] })}
                        >
                            <option value="service">{t.source_service}</option>
                            <option value="main">{t.source_main}</option>
                            <option value="visible">{t.source_visible}</option>
                            <option value="all">{t.source_all}</option>
                        </select>
                    </div>
                </div>

                <div className="filters-section">
                    <label className="filters-label">{t.date_range}</label>
                    <div className="filters-grid">
                        <input
                            type="date"
                            value={local.dateStart}
                            onChange={e => setLocal({ ...local, dateStart: e.target.value })}
                        />
                        <span className="filters-sep">{t.to}</span>
                        <input
                            type="date"
                            value={local.dateEnd}
                            onChange={e => setLocal({ ...local, dateEnd: e.target.value })}
                        />
                    </div>
                </div>

                <div className="filters-section">
                    <label className="filters-label">{t.time_of_day}</label>
                    <div className="filters-grid">
                        <input
                            type="time"
                            value={local.startTime}
                            onChange={e => setLocal({ ...local, startTime: e.target.value })}
                        />
                        <span className="filters-sep">-</span>
                        <input
                            type="time"
                            value={local.endTime}
                            onChange={e => setLocal({ ...local, endTime: e.target.value })}
                        />
                    </div>
                </div>

                <div className="filters-section">
                    <label className="filters-label">{t.days}</label>
                    <div className="filters-days">
                        {(lang === 'fr' ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((d, i) => {
                            const dayNum = i + 1;
                            const active = local.days.includes(dayNum);
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => toggleDay(dayNum)}
                                    className={`day-chip ${active ? 'active' : ''}`}
                                >
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="filters-actions">
                    <button onClick={handleReset} className="btn">{t.reset}</button>
                    <button onClick={handleApply} className="btn btn-primary">{t.apply_filters}</button>
                </div>
            </div>
        </div>
    );
}
