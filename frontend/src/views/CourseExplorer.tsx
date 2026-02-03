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
}

export function CourseExplorer({ events }: Props) {
    const [selectedSubject, setSelectedSubject] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [tab, setTab] = useState<'list' | 'calendar' | 'teachers'>('list');
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

        // Hide mutualized duplicates: same teacher, time, and type should appear once
        const seen = new Set<string>();
        return subjectEvents.filter(ev => {
            const key = `${ev.start_iso}|${ev.end_iso}|${ev.type_}|${(ev as any).extractedTeacher || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
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

    // 3. Stats & Teacher Analysis
    const stats = useMemo(() => {
        let cm = 0, td = 0, tp = 0, exam = 0, total = 0;
        const teacherMap = new Map<string, { cm: number, td: number, tp: number, total: number }>();

        courseEvents.forEach(ev => {
            const dur = ev.duration_hours || 0;
            const type = (ev.type_ || "").toUpperCase();

            // Stats
            if (type.includes("CM")) cm += dur;
            else if (type.includes("TD")) td += dur;
            else if (type.includes("TP")) tp += dur;
            else if (type.includes("EXAM") || type.includes("DS")) exam += dur;
            total += dur;

            // Teacher Extraction
            const teacherName = (ev as any).extractedTeacher || t.unknown;

            if (!teacherMap.has(teacherName)) teacherMap.set(teacherName, { cm: 0, td: 0, tp: 0, total: 0 });
            const tStat = teacherMap.get(teacherName)!;
            tStat.total += dur;
            if (type.includes("CM")) tStat.cm += dur;
            else if (type.includes("TD")) tStat.td += dur;
            else if (type.includes("TP")) tStat.tp += dur;
        });

        return { cm, td, tp, exam, total, teachers: Array.from(teacherMap.entries()) };
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

    return (
        <div className="course-explorer fade-in full-height-view" style={{ display: 'flex', minHeight: 0, gap: '1rem', height: '100%' }}>

            {/* Sidebar: Subject List - LEFT SIDE */}
            <div className="card" style={{
                width: '320px',
                display: 'flex',
                flexDirection: 'column',
                padding: '1rem',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)'
            }}>
                <h3 style={{
                    marginTop: 0,
                    marginBottom: '1rem',
                    fontSize: '1.1rem',
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
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border-color)',
                        width: '100%',
                        fontSize: '0.9rem',
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
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.75rem',
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
                    gap: '0.5rem',
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
                                    padding: '0.75rem',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius)',
                                    background: isSelected ? colors.bg : 'transparent',
                                    color: isSelected ? colors.text : 'var(--text-color)',
                                    fontWeight: isSelected ? 600 : 500,
                                    fontSize: '0.9rem',
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
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: subjectColors ? getSubjectColorLight(selectedSubject) : 'var(--bg-color)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h2 style={{
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    fontSize: '1.5rem',
                                    fontWeight: 700
                                }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '8px',
                                        height: '32px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: subjectColors?.bg || 'var(--primary-color)'
                                    }}></span>
                                    {selectedSubject}
                                </h2>
                                <div className="tabs" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className={`btn ${tab === 'list' ? 'btn-primary' : ''}`} onClick={() => setTab('list')}>
                                        📋 {t.list}
                                    </button>
                                    <button className={`btn ${tab === 'calendar' ? 'btn-primary' : ''}`} onClick={() => setTab('calendar')}>
                                        📅 {t.calendar}
                                    </button>
                                    <button className={`btn ${tab === 'teachers' ? 'btn-primary' : ''}`} onClick={() => setTab('teachers')}>
                                        👥 {t.by_teacher}
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '2rem',
                                flexWrap: 'wrap',
                                padding: '1rem',
                                background: 'white',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-xs)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_label}</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color)' }}>{stats.total.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.5rem' }}>📖</span>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e40af' }}>{stats.cm.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.5rem' }}>✏️</span>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>{stats.td.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.5rem' }}>🔬</span>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#374151' }}>{stats.tp.toFixed(1)}h</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div style={{ flex: 1, overflowY: tab === 'calendar' ? 'hidden' : 'auto', padding: '0.5rem', minHeight: 0 }}>

                            {tab === 'list' && (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                        <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
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
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{formatDate((ev as any).start_date)}</td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                                                        {formatTime((ev as any).start_date)} - {formatTime((ev as any).end_date)}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 600 }}>
                                                        {(ev as any).extractedTeacher || '—'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {(ev as any).promo || '—'}
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
                                                <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.teachers.map(([name, s]) => (
                                                <tr key={name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '0.8rem', fontWeight: 600, fontSize: '0.95rem' }}>{name}</td>
                                                    <td style={{ padding: '0.8rem', color: '#1e40af', fontFamily: 'var(--font-mono)' }}>{s.cm.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#166534', fontFamily: 'var(--font-mono)' }}>{s.td.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', color: '#92400e', fontFamily: 'var(--font-mono)' }}>{s.tp.toFixed(1)}h</td>
                                                    <td style={{ padding: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.total.toFixed(1)}h</td>
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
        </div>
    );
}
