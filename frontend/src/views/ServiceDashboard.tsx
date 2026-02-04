import { useMemo, useState } from 'react';
import type { NormalizedEvent } from '../types';
import { useLang, useT } from '../i18n';

interface Props {
    events: NormalizedEvent[];
    selectedTeacher?: string;
    isMobile?: boolean;
}

interface Stats {
    cm: number;
    td: number;
    tp: number;
    reunion: number;
    exam: number;
    other: number;
    total: number;
    count: number;
}

interface TeacherData {
    name: string;
    subjects: Map<string, Stats>;
    grandTotal: number;
}

export function ServiceDashboard({ events, selectedTeacher, isMobile = false }: Props) {
    const t = useT();
    const lang = useLang();
    const showEmpty = false;

    // Column Viz Toggles
    const [cols, setCols] = useState({
        cm: true,
        td: true,
        tp: true,
        reunion: false,
        exam: false,
        other: false
    });
    const colKeys = ['cm', 'td', 'tp', 'reunion', 'exam', 'other'] as const;

    const baseEvents = useMemo(() => {
        if (!selectedTeacher) return events;
        const target = selectedTeacher.toLowerCase();
        return events.filter(ev => {
            const teacherStr = ((ev as any).extractedTeacher || '').toLowerCase();
            return teacherStr.split(',').map((t: string) => t.trim()).includes(target);
        });
    }, [events, selectedTeacher]);

    const summary = useMemo(() => {
        const totals = { cm: 0, td: 0, tp: 0, reunion: 0, exam: 0, other: 0 };
        baseEvents.forEach(ev => {
            if ((ev as any).is_duplicate) return;
            const duration = ev.duration_hours || 0;
            const type = (ev.type_ || '').toUpperCase();
            if (type.includes('CM')) totals.cm += duration;
            else if (type.includes('TD')) totals.td += duration;
            else if (type.includes('TP')) totals.tp += duration;
            else if (type.includes('RÉUNION') || type.includes('REUNION')) totals.reunion += duration;
            else if (type.includes('EXAM') || type.includes('DS') || type.includes('CT')) totals.exam += duration;
            else totals.other += duration;
        });
        const totalTeaching = totals.cm + totals.td + totals.tp;
        return { ...totals, totalTeaching };
    }, [baseEvents]);

    const teacherStats = useMemo(() => {
        const teachers = new Map<string, TeacherData>();

        baseEvents.forEach(ev => {
            // Logic: Skip if marked as duplicate (Smart Deduplication)
            // But only for the same teacher! 
            // The is_duplicate flag from App.tsx assumes if same time/subject/type 
            // it's likely a duplicate across promo calendars.
            if ((ev as any).is_duplicate) return;

            const teacherStr = ((ev as any).extractedTeacher || '').trim();
            const teacherNames = selectedTeacher
                ? [selectedTeacher]
                : (teacherStr
                    ? teacherStr.split(',').map((t: string) => t.trim()).filter(Boolean)
                    : [t.unknown_teacher]);

            teacherNames.forEach((teacherName: string) => {
                if (!teachers.has(teacherName)) {
                    teachers.set(teacherName, { name: teacherName, subjects: new Map(), grandTotal: 0 });
                }

                const tData = teachers.get(teacherName)!;
                let subject = ev.subject || t.unknown_subject;
                subject = subject.trim();

                if (!tData.subjects.has(subject)) {
                    tData.subjects.set(subject, { cm: 0, td: 0, tp: 0, reunion: 0, exam: 0, other: 0, total: 0, count: 0 });
                }

                const entry = tData.subjects.get(subject)!;
                const duration = ev.duration_hours || 0;
                const type = (ev.type_ || "").toUpperCase();

                if (type.includes("CM")) entry.cm += duration;
                else if (type.includes("TD")) entry.td += duration;
                else if (type.includes("TP")) entry.tp += duration;
                else if (type.includes("RÉUNION") || type.includes("REUNION")) entry.reunion += duration;
                else if (type.includes("EXAM") || type.includes("DS") || type.includes("CT")) entry.exam += duration;
                else entry.other += duration;

                entry.count++;
            });
        });

        // Convert to array and calculate filtered totals
        return Array.from(teachers.values())
            .map(t => {
                let tGrandTotal = 0;
                const subjectList = Array.from(t.subjects.entries()).map(([name, s]) => {
                const filteredTotal = s.cm + s.td + s.tp;
                tGrandTotal += filteredTotal;
                return { name, ...s, filteredTotal };
            }).filter(row => {
                if (showEmpty) return true;
                const hasCore = row.cm > 0 || row.td > 0 || row.tp > 0;
                const hasExtras = (cols.exam && row.exam > 0) || (cols.reunion && row.reunion > 0) || (cols.other && row.other > 0);
                return hasCore || hasExtras;
            }).sort((a, b) => b.filteredTotal - a.filteredTotal);

                return { ...t, subjectList, grandTotal: tGrandTotal };
            })
            // Hide teacher sections when no visible rows after column filtering
            .filter(t => t.subjectList.length > 0)
            .sort((a, b) => b.grandTotal - a.grandTotal);
    }, [baseEvents, cols, showEmpty, t]);

    return (
        <div className="service-dashboard fade-in page-scroll" style={{ height: '100%', minHeight: 0, overflowY: 'auto', paddingRight: isMobile ? '0.15rem' : '0.25rem' }}>
            {/* Controls */}
            <div className="card" style={{ padding: isMobile ? '0.4rem 0.5rem' : '0.55rem 0.75rem', marginBottom: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: isMobile ? '0.5rem' : '0.8rem', alignItems: 'center' }}>
                {selectedTeacher && (
                    <div style={{ fontSize: isMobile ? '0.68rem' : '0.78rem', color: '#475569' }}>
                        {t.teacher}: <strong>{selectedTeacher}</strong>
                    </div>
                )}
                <div>
                    <div style={{ display: 'flex', gap: isMobile ? '0.35rem' : '0.55rem', flexWrap: 'wrap' }}>
                        {colKeys.map(key => (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', cursor: 'pointer', textTransform: 'uppercase', fontSize: isMobile ? '0.64rem' : '0.72rem' }}>
                                <input type="checkbox" checked={cols[key]} onChange={e => setCols({ ...cols, [key]: e.target.checked })} />
                                {key}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: isMobile ? '0.4rem 0.5rem' : '0.55rem 0.75rem', marginBottom: '0.6rem' }}>
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '0.7rem' : '1.1rem',
                    flexWrap: 'wrap',
                    padding: isMobile ? '0.4rem 0.5rem' : '0.55rem 0.7rem',
                    background: 'white',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow-xs)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1rem' }}>⏱️</span>
                        <div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_label}</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)' }}>{summary.totalTeaching.toFixed(1)}h</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1rem' }}>📖</span>
                        <div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>{summary.cm.toFixed(1)}h</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1rem' }}>✏️</span>
                        <div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>{summary.td.toFixed(1)}h</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1rem' }}>🔬</span>
                        <div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>{summary.tp.toFixed(1)}h</div>
                        </div>
                    </div>
                    <div style={{
                        marginLeft: 'auto',
                        minWidth: isMobile ? '100%' : '260px',
                        color: '#64748b',
                        fontSize: isMobile ? '0.68rem' : '0.74rem',
                        borderLeft: isMobile ? '0' : '1px solid var(--border-color)',
                        paddingLeft: isMobile ? '0' : '0.8rem'
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{lang === 'fr' ? 'Non compté' : 'Not counted'}</div>
                        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                            <div>🧪 {t.exam}: {summary.exam.toFixed(1)}h</div>
                            <div>🗓️ {t.reunion}: {summary.reunion.toFixed(1)}h</div>
                            <div>📌 {t.other}: {summary.other.toFixed(1)}h</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Teacher Sections */}
            {teacherStats.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    {t.no_events_service}
                </div>
            ) : (
                teacherStats.map(teacher => (
                    <section key={teacher.name} className="card" style={{ padding: '0', marginBottom: '2rem', overflow: 'hidden' }}>
                        <div style={{ background: '#f8fafc', padding: isMobile ? '0.55rem 0.7rem' : '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: isMobile ? '0.9rem' : '1.25rem' }}>{teacher.name}</h2>
                            <div style={{ fontSize: isMobile ? '0.88rem' : '1.2rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                                {teacher.grandTotal.toFixed(1)} h
                            </div>
                        </div>

                        <div className="table-container service-table-container">
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', background: '#fff', fontSize: isMobile ? '0.66rem' : undefined }}>
                                        <th style={{ padding: isMobile ? '0.45rem 0.6rem' : '1rem 1.5rem' }}>{t.subject}</th>
                                        {cols.cm && <th style={{ textAlign: 'right' }}>CM</th>}
                                        {cols.td && <th style={{ textAlign: 'right' }}>TD</th>}
                                        {cols.tp && <th style={{ textAlign: 'right' }}>TP</th>}
                                        <th style={{ textAlign: 'right', padding: isMobile ? '0.45rem 0.6rem' : '1rem 1.5rem', background: '#f1f5f9' }}>{t.total}</th>
                                        {cols.exam && <th style={{ textAlign: 'right' }}>{t.exam}</th>}
                                        {cols.reunion && <th style={{ textAlign: 'right' }}>{t.reunion}</th>}
                                        {cols.other && <th style={{ textAlign: 'right' }}>{t.other}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {teacher.subjectList.map(row => (
                                        <tr key={row.name} style={{ borderTop: '1px solid #f1f5f9', fontSize: isMobile ? '0.68rem' : undefined }}>
                                            <td style={{ padding: isMobile ? '0.42rem 0.6rem' : '0.8rem 1.5rem', fontWeight: 500 }}>{row.name}</td>
                                            {cols.cm && <td style={{ textAlign: 'right' }}>{row.cm > 0 ? row.cm.toFixed(1) : '-'}</td>}
                                            {cols.td && <td style={{ textAlign: 'right' }}>{row.td > 0 ? row.td.toFixed(1) : '-'}</td>}
                                            {cols.tp && <td style={{ textAlign: 'right' }}>{row.tp > 0 ? row.tp.toFixed(1) : '-'}</td>}
                                            <td style={{ textAlign: 'right', padding: isMobile ? '0.42rem 0.6rem' : '0.8rem 1.5rem', fontWeight: 700, background: '#f8fafc' }}>
                                                {row.filteredTotal.toFixed(1)}
                                            </td>
                                            {cols.exam && <td style={{ textAlign: 'right' }}>{row.exam > 0 ? row.exam.toFixed(1) : '-'}</td>}
                                            {cols.reunion && <td style={{ textAlign: 'right' }}>{row.reunion > 0 ? row.reunion.toFixed(1) : '-'}</td>}
                                            {cols.other && <td style={{ textAlign: 'right' }}>{row.other > 0 ? row.other.toFixed(1) : '-'}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))
            )}

            <p style={{ textAlign: 'right', color: '#64748b', fontSize: '0.85rem', padding: '0 1rem' }}>
                {t.smart_dedupe_note}
            </p>
        </div>
    );
}
