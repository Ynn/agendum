import { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { NormalizedEvent } from '../types';
import frLocale from '@fullcalendar/core/locales/fr';
import { useLang, useT } from '../i18n';
import { getSubjectColor, getSubjectColorLight } from '../utils/colors';

interface Props {
    events: NormalizedEvent[];
    isMobile?: boolean;
    isTablet?: boolean;
}

export function CourseExplorer({ events, isMobile = false, isTablet = false }: Props) {
    const [selectedSubject, setSelectedSubject] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [tab, setTab] = useState<'list' | 'calendar' | 'teachers'>('list');
    const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
    const lang = useLang();
    const t = useT();

    // 1. Extract unique subjects and apply filter
    const subjects = useMemo(() => {
        const set = new Set<string>();
        events.forEach(ev => {
            if (ev.subject && ev.subject.length > 2) set.add(ev.subject);
        });
        const all = Array.from(set).sort();
        if (!subjectFilter) return all;
        const term = subjectFilter.toLowerCase();
        return all.filter(s => s.toLowerCase().includes(term));
    }, [events, subjectFilter]);

    // 2. Filter events for selected subject
    const courseEvents = useMemo(() => {
        if (!selectedSubject) return [];

        const subjectEvents = events
            .filter(ev => ev.subject === selectedSubject)
            .sort((a, b) => {
                const aTs = (a as any).start_ts ?? 0;
                const bTs = (b as any).start_ts ?? 0;
                return aTs - bTs;
            });

        const addPromos = (set: Set<string>, value?: string) => {
            if (!value) return;
            value
                .split(',')
                .map(v => v.trim())
                .filter(Boolean)
                .forEach(v => set.add(v));
        };

        // Merge mutualized duplicates: same teacher, time, and type should appear once
        // but keep all promos (comma-separated)
        const merged = new Map<string, { base: NormalizedEvent; promos: Set<string> }>();

        subjectEvents.forEach(ev => {
            const key = `${ev.start_iso}|${ev.end_iso}|${ev.type_}|${(ev as any).extractedTeacher || ''}`;
            let entry = merged.get(key);
            if (!entry) {
                entry = { base: ev, promos: new Set<string>() };
                merged.set(key, entry);
            }
            addPromos(entry.promos, (ev as any).promo || '');
        });

        return Array.from(merged.values())
            .map(({ base, promos }) => ({
                ...base,
                promo: Array.from(promos).join(', ')
            }))
            .sort((a, b) => {
                const aTs = (a as any).start_ts ?? 0;
                const bTs = (b as any).start_ts ?? 0;
                return aTs - bTs;
            });
    }, [selectedSubject, events]);

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

    const splitTeachers = (value?: string) => {
        if (!value) return [];
        return value
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
    };

    const rawEventLabel = lang === 'fr' ? "Voir l'événement brut" : 'View raw event';

    const renderEventModal = () => {
        if (!selectedEvent) return null;
        const start = (selectedEvent as any).start_date as Date | undefined;
        const end = (selectedEvent as any).end_date as Date | undefined;
        const title = selectedEvent.raw.summary?.trim() ||
            `${selectedEvent.type_} ${selectedEvent.subject || ''}`.trim() ||
            t.unknown;

        return (
            <div className="event-modal-overlay">
                <div className="event-modal-backdrop" onClick={() => setSelectedEvent(null)} />
                <div className="card event-modal">
                    <div className="event-modal-header">
                        <div style={{ fontWeight: 700 }}>{title}</div>
                        <button className="btn" onClick={() => setSelectedEvent(null)} style={{ padding: '0.2rem 0.6rem' }}>×</button>
                    </div>
                    <div className="event-modal-grid">
                        <div><strong>{t.time}:</strong> {formatDate(start)} • {formatTime(start)} - {formatTime(end)}</div>
                        <div><strong>{t.location}:</strong> {selectedEvent.raw.location || '—'}</div>
                        <div><strong>{t.duration}:</strong> {selectedEvent.duration_hours}h</div>
                    </div>
                    <div style={{ marginTop: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {selectedEvent.raw.description || '—'}
                    </div>
                </div>
            </div>
        );
    };

    // 3. Stats & Teacher Analysis
    const stats = useMemo(() => {
        let cm = 0, td = 0, tp = 0, project = 0, exam = 0, other = 0, total = 0;
        const teacherMap = new Map<string, { cm: number, td: number, tp: number, project: number, exam: number, other: number, total: number }>();

        courseEvents.forEach(ev => {
            const dur = ev.duration_hours || 0;
            const type = (ev.type_ || "").toUpperCase();

            // Stats
            let bucket: 'cm' | 'td' | 'tp' | 'project' | 'exam' | 'other' = 'other';
            if (type.includes("CM")) bucket = 'cm';
            else if (type.includes("TD")) bucket = 'td';
            else if (type.includes("TP")) bucket = 'tp';
            else if (type.includes("PROJET") || type.includes("PROJECT")) bucket = 'project';
            else if (type.includes("EXAM") || type.includes("DS") || type.includes("CC") || type.includes("CT")) bucket = 'exam';
            else bucket = 'other';

            if (bucket === 'cm') cm += dur;
            else if (bucket === 'td') td += dur;
            else if (bucket === 'tp') tp += dur;
            else if (bucket === 'project') project += dur;
            else if (bucket === 'exam') exam += dur;
            else other += dur;

            if (bucket === 'cm' || bucket === 'td' || bucket === 'tp' || bucket === 'project') {
                total += dur;
            }

            // Teacher Extraction
            const teacherNames = splitTeachers((ev as any).extractedTeacher);
            const targetTeachers = teacherNames.length > 0 ? teacherNames : [t.unknown];

            targetTeachers.forEach((teacherName) => {
                if (!teacherMap.has(teacherName)) {
                    teacherMap.set(teacherName, { cm: 0, td: 0, tp: 0, project: 0, exam: 0, other: 0, total: 0 });
                }
                const tStat = teacherMap.get(teacherName)!;
                if (bucket === 'cm') tStat.cm += dur;
                else if (bucket === 'td') tStat.td += dur;
                else if (bucket === 'tp') tStat.tp += dur;
                else if (bucket === 'project') tStat.project += dur;
                else if (bucket === 'exam') tStat.exam += dur;
                else tStat.other += dur;

                if (bucket === 'cm' || bucket === 'td' || bucket === 'tp' || bucket === 'project') {
                    tStat.total += dur;
                }
            });
        });

        return { cm, td, tp, project, exam, other, total, teachers: Array.from(teacherMap.entries()) };
    }, [courseEvents, t]);

    // Calendar Events Format
    const calendarEvents = useMemo(() => {
        return courseEvents.map(ev => {
            const colors = getSubjectColor(selectedSubject);
            return {
                title: `${ev.type_} - ${ev.raw.location || ''}`,
                start: ev.start_iso,
                end: ev.end_iso,
                backgroundColor: colors.bg,
                borderColor: colors.bg,
                textColor: colors.text,
                extendedProps: {
                    location: ev.raw.location,
                    description: ev.raw.description
                }
            };
        });
    }, [courseEvents, selectedSubject]);

    // Get color for selected subject
    const subjectColors = selectedSubject ? getSubjectColor(selectedSubject) : null;

    if (isMobile) {
        return (
            <>
            <div className="course-mobile fade-in page-scroll" style={{ height: '100%', minHeight: 0, overflowY: 'auto', padding: '0.35rem 0.2rem 0.6rem' }}>
                {!selectedSubject ? (
                    <div className="card" style={{ padding: '0.7rem', minHeight: 0 }}>
                        <h3 style={{
                            marginTop: 0,
                            marginBottom: '0.6rem',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                        }}>
                            <span>📚</span> {t.subjects}
                        </h3>
                        <input
                            type="text"
                            placeholder={`🔍 ${t.filter_subjects}`}
                            style={{
                                padding: '0.55rem',
                                marginBottom: '0.6rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border-color)',
                                width: '100%',
                                fontSize: '0.85rem',
                                outline: 'none'
                            }}
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                        />
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            {subjects.length} {subjects.length === 1 ? 'matiere' : 'matieres'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {subjects.map(s => {
                                const colors = getSubjectColor(s);
                                return (
                                    <button
                                        key={s}
                                        className="btn"
                                        onClick={() => {
                                            setSelectedSubject(s);
                                            setTab('list');
                                        }}
                                        style={{
                                            justifyContent: 'flex-start',
                                            fontSize: '0.82rem',
                                            padding: '0.45rem 0.6rem',
                                            borderLeft: `4px solid ${colors.bg}`,
                                            background: 'var(--card-bg)'
                                        }}
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: '0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            padding: '0.65rem 0.7rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: subjectColors ? getSubjectColorLight(selectedSubject) : 'var(--bg-color)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem' }}>
                                <button
                                    className="btn"
                                    style={{ padding: '0.2rem 0.42rem', fontSize: '0.78rem' }}
                                    onClick={() => setSelectedSubject('')}
                                >
                                    ←
                                </button>
                                <h2 style={{
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    fontSize: '1rem',
                                    fontWeight: 700
                                }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '6px',
                                        height: '20px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: subjectColors?.bg || 'var(--primary-color)'
                                    }}></span>
                                    {selectedSubject}
                                </h2>
                            </div>

                            <div className="tabs" style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.45rem' }}>
                                <button className={`btn ${tab === 'list' ? 'btn-primary' : ''}`} onClick={() => setTab('list')} style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}>
                                    📋 {t.list}
                                </button>
                                <button className={`btn ${tab === 'calendar' ? 'btn-primary' : ''}`} onClick={() => setTab('calendar')} style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}>
                                    📅 {t.calendar}
                                </button>
                                <button className={`btn ${tab === 'teachers' ? 'btn-primary' : ''}`} onClick={() => setTab('teachers')} style={{ fontSize: '0.74rem', padding: '0.2rem 0.4rem' }}>
                                    👥 {t.by_teacher}
                                </button>
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '0.8rem',
                                flexWrap: 'wrap',
                                padding: '0.45rem 0.55rem',
                                background: 'var(--card-bg)',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-xs)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>⏱️</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_label}</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-color)' }}>{stats.total.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>📖</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e40af' }}>{stats.cm.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>✏️</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#166534' }}>{stats.td.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🔬</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#374151' }}>{stats.tp.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🧩</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</div>
                                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#7c3aed' }}>{stats.project.toFixed(1)}h</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '0.45rem', minHeight: 0 }}>
                            {tab === 'list' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {courseEvents.map((ev, i) => (
                                        <div key={i} className="card" style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                    <strong style={{ fontSize: '0.82rem' }}>{ev.type_}</strong>
                                                    <button
                                                        className="btn"
                                                        title={rawEventLabel}
                                                        aria-label={rawEventLabel}
                                                        onClick={() => setSelectedEvent(ev)}
                                                        style={{
                                                            padding: '0.1rem 0.35rem',
                                                            fontSize: '0.7rem',
                                                            lineHeight: 1,
                                                            borderRadius: '999px'
                                                        }}
                                                    >
                                                        ⓘ
                                                    </button>
                                                </div>
                                                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{ev.duration_hours}h</span>
                                            </div>
                                            <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                                                {formatDate((ev as any).start_date)} • {formatTime((ev as any).start_date)}-{formatTime((ev as any).end_date)}
                                            </div>
                                            <div style={{ fontSize: '0.76rem', marginTop: '0.18rem' }}>{splitTeachers((ev as any).extractedTeacher).join(', ') || '—'}</div>
                                            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{ev.raw.location || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {tab === 'calendar' && (
                                <div style={{ height: '66vh', minHeight: 380 }}>
                                    <FullCalendar
                                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                                        initialView="listWeek"
                                        headerToolbar={{
                                            left: 'prev,next',
                                            center: 'title',
                                            right: 'dayGridMonth,listWeek'
                                        }}
                                        events={calendarEvents}
                                        locale={lang === 'fr' ? frLocale : undefined}
                                        firstDay={1}
                                        height="100%"
                                    />
                                </div>
                            )}

                            {tab === 'teachers' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {stats.teachers.map(([name, s]) => (
                                        <div key={name} className="card" style={{ padding: '0.45rem 0.55rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: '0.25rem' }}>{name}</div>
                                            <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                                                CM {s.cm.toFixed(1)}h • TD {s.td.toFixed(1)}h • TP {s.tp.toFixed(1)}h • {t.project} {s.project.toFixed(1)}h • {t.total} {s.total.toFixed(1)}h • {t.exam} {s.exam.toFixed(1)}h • {t.other} {s.other.toFixed(1)}h
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {renderEventModal()}
            </>
        );
    }

    return (
        <div className="course-explorer fade-in full-height-view" style={{ display: 'flex', minHeight: 0, gap: isTablet ? '0.6rem' : '1rem', height: '100%' }}>

            {/* Sidebar: Subject List - LEFT SIDE */}
            <div className="card" style={{
                width: isTablet ? '248px' : '320px',
                display: 'flex',
                flexDirection: 'column',
                padding: isTablet ? '0.7rem' : '1rem',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)'
            }}>
                <h3 style={{
                    marginTop: 0,
                    marginBottom: isTablet ? '0.65rem' : '1rem',
                    fontSize: isTablet ? '0.92rem' : '1.1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span>📚</span> {t.subjects}
                </h3>
                <input
                    type="text"
                    placeholder={`🔍 ${t.filter_subjects}`}
                    style={{
                        padding: isTablet ? '0.52rem' : '0.75rem',
                        marginBottom: isTablet ? '0.7rem' : '1rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border-color)',
                        width: '100%',
                        fontSize: isTablet ? '0.8rem' : '0.9rem',
                        transition: 'all var(--transition-base)',
                        outline: 'none'
                    }}
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-focus)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                />
                <div style={{
                    fontSize: isTablet ? '0.66rem' : '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: isTablet ? '0.5rem' : '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600
                }}>
                    {subjects.length} {subjects.length === 1 ? 'matière' : 'matières'}
                </div>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isTablet ? '0.36rem' : '0.5rem',
                    minHeight: 0,
                    paddingRight: '0.25rem'
                }}>
                    {subjects.map(s => {
                        const colors = getSubjectColor(s);
                        const isSelected = selectedSubject === s;
                        return (
                            <div
                                key={s}
                                onClick={() => setSelectedSubject(s)}
                                style={{
                                    padding: isTablet ? '0.55rem' : '0.75rem',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius)',
                                    background: isSelected ? colors.bg : 'transparent',
                                    color: isSelected ? colors.text : 'var(--text-color)',
                                    fontWeight: isSelected ? 600 : 500,
                                    fontSize: isTablet ? '0.78rem' : '0.9rem',
                                    transition: 'all var(--transition-base)',
                                    border: `2px solid ${isSelected ? colors.bg : 'transparent'}`,
                                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                                    transform: isSelected ? 'translateX(4px)' : 'none',
                                    position: 'relative',
                                    paddingLeft: '1rem'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = getSubjectColorLight(s);
                                        e.currentTarget.style.borderColor = colors.bg;
                                        e.currentTarget.style.transform = 'translateX(2px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = 'transparent';
                                        e.currentTarget.style.transform = 'none';
                                    }
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    left: '0.25rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '4px',
                                    height: isSelected ? '60%' : '0%',
                                    background: isSelected ? colors.text : colors.bg,
                                    borderRadius: 'var(--radius-full)',
                                    transition: 'height var(--transition-base)'
                                }}></div>
                                {s}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content - RIGHT SIDE */}
            <div className="card" style={{ flex: 1, padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                {!selectedSubject ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: 'var(--text-light)',
                        flexDirection: 'column',
                        gap: '1rem',
                        padding: '2rem'
                    }}>
                        <div style={{ fontSize: '3rem', opacity: 0.5 }}>📚</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{t.select_subject_hint}</div>
                    </div>
                ) : (
                    <>
                        {/* Header & Stats Header */}
                        <div style={{
                            padding: isTablet ? '0.55rem 0.65rem' : '0.7rem 0.9rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: subjectColors ? getSubjectColorLight(selectedSubject) : 'var(--bg-color)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isTablet ? '0.35rem' : '0.5rem', flexWrap: 'wrap', gap: isTablet ? '0.35rem' : '0.5rem' }}>
                                <h2 style={{
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    fontSize: isTablet ? '0.94rem' : '1.05rem',
                                    fontWeight: 700
                                }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '6px',
                                        height: isTablet ? '17px' : '20px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: subjectColors?.bg || 'var(--primary-color)'
                                    }}></span>
                                    {selectedSubject}
                                </h2>
                                <div className="tabs" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className={`btn ${tab === 'list' ? 'btn-primary' : ''}`} onClick={() => setTab('list')} style={{ fontSize: isTablet ? '0.68rem' : '0.75rem', padding: isTablet ? '0.17rem 0.34rem' : '0.2rem 0.45rem' }}>
                                        📋 {t.list}
                                    </button>
                                    <button className={`btn ${tab === 'calendar' ? 'btn-primary' : ''}`} onClick={() => setTab('calendar')} style={{ fontSize: isTablet ? '0.68rem' : '0.75rem', padding: isTablet ? '0.17rem 0.34rem' : '0.2rem 0.45rem' }}>
                                        📅 {t.calendar}
                                    </button>
                                    <button className={`btn ${tab === 'teachers' ? 'btn-primary' : ''}`} onClick={() => setTab('teachers')} style={{ fontSize: isTablet ? '0.68rem' : '0.75rem', padding: isTablet ? '0.17rem 0.34rem' : '0.2rem 0.45rem' }}>
                                        👥 {t.by_teacher}
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '0.9rem',
                                flexWrap: 'wrap',
                                padding: '0.45rem 0.6rem',
                                background: 'var(--card-bg)',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-xs)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>⏱️</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_label}</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)' }}>{stats.total.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>📖</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>{stats.cm.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>✏️</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>{stats.td.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🔬</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>{stats.tp.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🧩</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7c3aed' }}>{stats.project.toFixed(1)}h</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div style={{ flex: 1, overflowY: tab === 'calendar' ? 'hidden' : 'auto', padding: '0.5rem', minHeight: 0 }}>

                            {tab === 'list' && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 10 }}>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.type}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.date}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.time}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.teacher}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.promo}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.location}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.duration}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {courseEvents.map((ev, i) => (
                                                <tr key={i} style={{
                                                    borderBottom: '1px solid var(--border-color)',
                                                    transition: 'background var(--transition-fast)'
                                                }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span style={{
                                                                padding: '4px 12px',
                                                                borderRadius: 'var(--radius-full)',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600,
                                                                background: ev.type_.toUpperCase().includes('CM') ? '#dbeafe' :
                                                                    ev.type_.toUpperCase().includes('TD') ? '#dcfce7' :
                                                                        ev.type_.toUpperCase().includes('TP') ? '#fef3c7' : '#f3f4f6',
                                                                color: ev.type_.toUpperCase().includes('CM') ? '#1e40af' :
                                                                    ev.type_.toUpperCase().includes('TD') ? '#166534' :
                                                                        ev.type_.toUpperCase().includes('TP') ? '#92400e' : '#374151',
                                                                display: 'inline-block'
                                                            }}>
                                                                {ev.type_}
                                                            </span>
                                                            <button
                                                                className="btn"
                                                                title={rawEventLabel}
                                                                aria-label={rawEventLabel}
                                                                onClick={() => setSelectedEvent(ev)}
                                                                style={{
                                                                    padding: '0.12rem 0.35rem',
                                                                    fontSize: '0.7rem',
                                                                    lineHeight: 1,
                                                                    borderRadius: '999px'
                                                                }}
                                                            >
                                                                ⓘ
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{formatDate((ev as any).start_date)}</td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                                                        {formatTime((ev as any).start_date)} - {formatTime((ev as any).end_date)}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 600 }}>
                                                        {splitTeachers((ev as any).extractedTeacher).join(', ') || '—'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {(() => {
                                                            const promoText = (ev as any).promo || '—';
                                                            return (
                                                                <div
                                                                    title={promoText}
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        width: '220px',
                                                                        minWidth: '120px',
                                                                        maxWidth: '480px',
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        resize: 'horizontal',
                                                                        paddingRight: '0.25rem',
                                                                        verticalAlign: 'middle'
                                                                    }}
                                                                >
                                                                    {promoText}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        {ev.raw.location || '—'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{ev.duration_hours}h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {tab === 'calendar' && (
                                <div style={{ height: '100%', minHeight: 0 }}>
                                    <FullCalendar
                                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                                        initialView="listWeek"
                                        headerToolbar={{
                                            left: 'prev,next today',
                                            center: 'title',
                                            right: 'dayGridMonth,timeGridWeek,listWeek'
                                        }}
                                        events={calendarEvents}
                                        locale={lang === 'fr' ? frLocale : undefined}
                                        firstDay={1}
                                        height="100%"
                                        expandRows={true}
                                    />
                                </div>
                            )}

                            {tab === 'teachers' && (
                                <div>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left' }}>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.source_teacher}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.exam}</th>
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.other}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.teachers.map(([name, s]) => (
                                                <tr key={name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '0.8rem', fontWeight: 600, fontSize: '0.95rem' }}>{name}</td>
                                                    <td style={{ padding: '0.8rem', color: '#1e40af', fontFamily: 'var(--font-mono)' }}>{s.cm.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#166534', fontFamily: 'var(--font-mono)' }}>{s.td.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#92400e', fontFamily: 'var(--font-mono)' }}>{s.tp.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#7c3aed', fontFamily: 'var(--font-mono)' }}>{s.project.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.total.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>{s.exam.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.other.toFixed(1)}h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--info)' }}>
                                        ℹ️ {t.teacher_breakdown_note}
                                    </p>
                                </div>
                            )}

                        </div>
                    </>
                )}
            </div>
            {renderEventModal()}
        </div>
    );
}
