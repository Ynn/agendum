import { useMemo, useState } from 'react';
import type { NormalizedEvent } from '../types';
import { useLang, useT } from '../i18n';

interface Props {
    events: NormalizedEvent[];
    selectedTeacher?: string;
    isMobile?: boolean;
    onSelectSubject?: (subject: string) => void;
}

interface Stats {
    cm: number;
    td: number;
    tp: number;
    project: number;
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

export function ServiceDashboard({ events, selectedTeacher, isMobile = false, onSelectSubject }: Props) {
    const t = useT();
    const lang = useLang();
    const showEmpty = false;

    const splitTeacherNames = (value?: string) => {
        if (!value) return [];
        return value
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
    };

    const isUnknownTeacherToken = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return true;
        if (trimmed === '—') return true;
        const lower = trimmed.toLowerCase();
        return lower === 'unknown teacher' || lower === t.unknown_teacher.toLowerCase();
    };

    const unknownTeacherLabel = selectedTeacher ? '—' : t.unknown_teacher;

    // Column Viz Toggles
    const [cols, setCols] = useState({
        cm: true,
        td: true,
        tp: true,
        project: true,
        reunion: false,
        exam: false,
        other: true
    });
    const colKeys = ['cm', 'td', 'tp', 'project', 'reunion', 'exam', 'other'] as const;
    const colLabels: Record<typeof colKeys[number], string> = {
        cm: 'CM',
        td: 'TD',
        tp: 'TP',
        project: isMobile ? t.project_short : t.project,
        reunion: isMobile ? t.reunion_short : t.reunion,
        exam: isMobile ? t.exam_short : t.exam,
        other: isMobile ? t.other_short : t.other
    };
    const compactHead = isMobile ? { padding: '0.45rem 0.35rem', whiteSpace: 'nowrap' as const, minWidth: '5.5ch' } : {};
    const compactHeadWide = isMobile ? { ...compactHead, minWidth: '6.5ch' } : compactHead;
    const compactCell = isMobile ? { padding: '0.42rem 0.35rem' } : {};

    const baseEvents = useMemo(() => {
        if (!selectedTeacher) return events;
        const target = selectedTeacher.toLowerCase();
        return events.filter(ev => {
            const teacherStr = ((ev as any).extractedTeacher || '').toLowerCase();
            const teacherTokens = splitTeacherNames(teacherStr);
            const matchesSelected = teacherTokens.some(t => t.toLowerCase() === target);
            const isUnknown = teacherTokens.length === 0 || teacherTokens.every(isUnknownTeacherToken);
            return matchesSelected || isUnknown;
        });
    }, [events, selectedTeacher, t]);

    const summary = useMemo(() => {
        const totals = { cm: 0, td: 0, tp: 0, project: 0, reunion: 0, exam: 0, other: 0 };
        baseEvents.forEach(ev => {
            if ((ev as any).is_duplicate) return;
            const duration = ev.duration_hours || 0;
            const type = (ev.type_ || '').toUpperCase();
            if (type.includes('CM')) totals.cm += duration;
            else if (type.includes('TD')) totals.td += duration;
            else if (type.includes('TP')) totals.tp += duration;
            else if (type.includes('PROJET') || type.includes('PROJECT')) totals.project += duration;
            else if (type.includes('RÉUNION') || type.includes('REUNION')) totals.reunion += duration;
            else if (type.includes('EXAM') || type.includes('DS') || type.includes('CT') || type.includes('CC')) totals.exam += duration;
            else totals.other += duration;
        });
        const totalCore = totals.cm + totals.td + totals.tp;
        const totalTeaching = totalCore + totals.project;
        return { ...totals, totalCore, totalTeaching };
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
            const teacherTokens = splitTeacherNames(teacherStr);
            const matchesSelected = selectedTeacher
                ? teacherTokens.some(name => name.toLowerCase() === selectedTeacher.toLowerCase())
                : false;
            const isUnknown = teacherTokens.length === 0 || teacherTokens.every(isUnknownTeacherToken);

            let teacherNames: string[] = [];
            if (selectedTeacher) {
                if (matchesSelected) teacherNames = [selectedTeacher];
                else if (isUnknown) teacherNames = [unknownTeacherLabel];
                else return;
            } else {
                teacherNames = (!isUnknown && teacherTokens.length > 0) ? teacherTokens : [unknownTeacherLabel];
            }

            teacherNames.forEach((teacherName: string) => {
                if (!teachers.has(teacherName)) {
                    teachers.set(teacherName, { name: teacherName, subjects: new Map(), grandTotal: 0 });
                }

                const tData = teachers.get(teacherName)!;
                let subject = ev.subject || t.unknown_subject;
                subject = subject.trim();

                if (!tData.subjects.has(subject)) {
                    tData.subjects.set(subject, { cm: 0, td: 0, tp: 0, project: 0, reunion: 0, exam: 0, other: 0, total: 0, count: 0 });
                }

                const entry = tData.subjects.get(subject)!;
                const duration = ev.duration_hours || 0;
                const type = (ev.type_ || "").toUpperCase();

                if (type.includes("CM")) entry.cm += duration;
                else if (type.includes("TD")) entry.td += duration;
                else if (type.includes("TP")) entry.tp += duration;
                else if (type.includes("PROJET") || type.includes("PROJECT")) entry.project += duration;
                else if (type.includes("RÉUNION") || type.includes("REUNION")) entry.reunion += duration;
                else if (type.includes("EXAM") || type.includes("DS") || type.includes("CT") || type.includes("CC")) entry.exam += duration;
                else entry.other += duration;

                entry.count++;
            });
        });

        // Convert to array and calculate filtered totals
        return Array.from(teachers.values())
            .map(t => {
                let tGrandTotal = 0;
                const totalsAll = { cm: 0, td: 0, tp: 0, project: 0, reunion: 0, exam: 0, other: 0 };
                const subjectList = Array.from(t.subjects.entries()).map(([name, s]) => {
                    totalsAll.cm += s.cm;
                    totalsAll.td += s.td;
                    totalsAll.tp += s.tp;
                    totalsAll.project += s.project;
                    totalsAll.reunion += s.reunion;
                    totalsAll.exam += s.exam;
                    totalsAll.other += s.other;
                    const filteredTotal = s.cm + s.td + s.tp + s.project;
                    tGrandTotal += filteredTotal;
                    return { name, ...s, filteredTotal };
                }).filter(row => {
                    if (showEmpty) return true;
                    const hasCore = row.cm > 0 || row.td > 0 || row.tp > 0 || row.project > 0;
                    const hasExtras = (cols.exam && row.exam > 0) || (cols.reunion && row.reunion > 0) || (cols.other && row.other > 0);
                    return hasCore || hasExtras;
                }).sort((a, b) => b.filteredTotal - a.filteredTotal);

                return { ...t, subjectList, grandTotal: tGrandTotal, totalsAll };
            })
            // Hide teacher sections when no visible rows after column filtering
            .filter(t => t.subjectList.length > 0)
            .sort((a, b) => {
                if (selectedTeacher) {
                    const aKey = a.name.toLowerCase();
                    const bKey = b.name.toLowerCase();
                    const selectedKey = selectedTeacher.toLowerCase();
                    if (aKey === selectedKey && bKey !== selectedKey) return -1;
                    if (bKey === selectedKey && aKey !== selectedKey) return 1;
                    if (a.name === unknownTeacherLabel && b.name !== unknownTeacherLabel) return -1;
                    if (b.name === unknownTeacherLabel && a.name !== unknownTeacherLabel) return 1;
                }
                return b.grandTotal - a.grandTotal;
            });
    }, [baseEvents, cols, showEmpty, t, selectedTeacher]);

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
                                {colLabels[key]}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.1rem 0 0.35rem 0.15rem', fontWeight: 600 }}>
                {lang === 'fr' ? 'Total de tous les services affichés' : 'Total of all displayed services'}
            </div>
            <div className="card" style={{ padding: isMobile ? '0.4rem 0.5rem' : '0.55rem 0.75rem', marginBottom: '0.6rem' }}>
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '0.7rem' : '1.1rem',
                    flexWrap: 'wrap',
                    padding: isMobile ? '0.4rem 0.5rem' : '0.55rem 0.7rem',
                    background: 'var(--card-bg)',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow-xs)'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: isMobile ? '0.6rem' : '0.35rem',
                        flexWrap: 'wrap',
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '1rem' }}>⏱️</span>
                            <div>
                                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_core_label}</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)' }}>{summary.totalCore.toFixed(1)}h</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '1rem' }}>∑</span>
                            <div>
                                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_with_project_label}</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-color)' }}>{summary.totalTeaching.toFixed(1)}h</div>
                            </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1rem' }}>🧩</span>
                        <div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7c3aed' }}>{summary.project.toFixed(1)}h</div>
                        </div>
                    </div>
                    <div style={{
                        marginLeft: 'auto',
                        minWidth: isMobile ? '100%' : '260px',
                        color: 'var(--text-muted)',
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
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
                    {t.no_events_service}
                </div>
            ) : (
                teacherStats.map(teacher => {
                    const totals = teacher.totalsAll;
                    const totalCore = totals.cm + totals.td + totals.tp;
                    const totalTeaching = totalCore + totals.project;
                    const longestSubjectLen = teacher.subjectList.length > 0
                        ? Math.max(8, ...teacher.subjectList.map(row => row.name.length))
                        : 12;
                    const subjectMaxCh = isMobile ? Math.max(12, Math.round(longestSubjectLen * 0.75)) : null;
                    const subjectColWidth = isMobile ? `${subjectMaxCh}ch` : undefined;
                    const numericCols = 1
                        + (cols.cm ? 1 : 0)
                        + (cols.td ? 1 : 0)
                        + (cols.tp ? 1 : 0)
                        + (cols.project ? 1 : 0)
                        + (cols.exam ? 1 : 0)
                        + (cols.reunion ? 1 : 0)
                        + (cols.other ? 1 : 0);
                    const tableMinWidth = isMobile ? `calc(${subjectColWidth} + ${numericCols * 6.5}ch)` : '100%';
                    return (
                        <section key={teacher.name} className="card" style={{ padding: '0', marginBottom: '2rem', overflow: 'hidden' }}>
                            <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '0.55rem 0.7rem' : '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: isMobile ? '0.9rem' : '1.25rem' }}>{teacher.name}</h2>
                                <div style={{ fontSize: isMobile ? '0.88rem' : '1.2rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                                    {teacher.grandTotal.toFixed(1)} h
                                </div>
                            </div>

                            <div style={{ padding: isMobile ? '0.45rem 0.55rem' : '0.7rem 1.2rem', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                                <div style={{
                                    display: 'flex',
                                    gap: isMobile ? '0.6rem' : '1.1rem',
                                    flexWrap: 'wrap',
                                    padding: isMobile ? '0.35rem 0.4rem' : '0.45rem 0.6rem',
                                    background: 'var(--card-bg)',
                                    borderRadius: 'var(--radius)',
                                    boxShadow: 'var(--shadow-xs)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        gap: isMobile ? '0.6rem' : '0.35rem',
                                        flexWrap: 'wrap',
                                        width: isMobile ? '100%' : 'auto'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <span style={{ fontSize: '1rem' }}>⏱️</span>
                                            <div>
                                                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_core_label}</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)' }}>{totalCore.toFixed(1)}h</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <span style={{ fontSize: '1rem' }}>∑</span>
                                            <div>
                                                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.total_with_project_label}</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-color)' }}>{totalTeaching.toFixed(1)}h</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ fontSize: '1rem' }}>📖</span>
                                        <div>
                                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CM</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e40af' }}>{totals.cm.toFixed(1)}h</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ fontSize: '1rem' }}>✏️</span>
                                        <div>
                                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TD</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534' }}>{totals.td.toFixed(1)}h</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ fontSize: '1rem' }}>🔬</span>
                                        <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TP</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>{totals.tp.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '1rem' }}>🧩</span>
                                    <div>
                                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.project}</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#7c3aed' }}>{totals.project.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div style={{
                                    marginLeft: 'auto',
                                    minWidth: isMobile ? '100%' : '260px',
                                        color: 'var(--text-muted)',
                                        fontSize: isMobile ? '0.68rem' : '0.74rem',
                                        borderLeft: isMobile ? '0' : '1px solid var(--border-color)',
                                        paddingLeft: isMobile ? '0' : '0.8rem'
                                    }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{lang === 'fr' ? 'Non compté' : 'Not counted'}</div>
                                        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
                                            <div>🧪 {t.exam}: {totals.exam.toFixed(1)}h</div>
                                            <div>🗓️ {t.reunion}: {totals.reunion.toFixed(1)}h</div>
                                            <div>📌 {t.other}: {totals.other.toFixed(1)}h</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="table-container service-table-container">
                                <table style={{ width: '100%', tableLayout: isMobile ? 'fixed' : 'auto', minWidth: tableMinWidth }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', background: 'var(--card-bg)', fontSize: isMobile ? '0.66rem' : undefined }}>
                                            <th style={{
                                                padding: isMobile ? '0.45rem 0.6rem' : '1rem 1.5rem',
                                                width: subjectColWidth,
                                                maxWidth: subjectColWidth
                                            }}>
                                                {isMobile ? t.subject_short : t.subject}
                                            </th>
                                            {cols.cm && <th style={{ textAlign: 'right', ...compactHead }}>CM</th>}
                                            {cols.td && <th style={{ textAlign: 'right', ...compactHead }}>TD</th>}
                                            {cols.tp && <th style={{ textAlign: 'right', ...compactHead }}>TP</th>}
                                            {cols.project && <th style={{ textAlign: 'right', ...compactHead }}>{isMobile ? t.project_short : t.project}</th>}
                                            <th style={{ textAlign: 'right', padding: isMobile ? '0.45rem 0.6rem' : '1rem 1.5rem', paddingLeft: isMobile ? '0.35rem' : undefined, background: 'var(--bg-secondary)' }}>{isMobile ? t.total_short : t.total}</th>
                                            {cols.exam && <th style={{ textAlign: 'right', ...compactHeadWide }}>{isMobile ? t.exam_short : t.exam}</th>}
                                            {cols.reunion && <th style={{ textAlign: 'right', ...compactHeadWide }}>{t.reunion}</th>}
                                            {cols.other && <th style={{ textAlign: 'right', ...compactHeadWide }}>{isMobile ? t.other_short : t.other}</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teacher.subjectList.map(row => (
                                            <tr key={row.name} style={{ borderTop: '1px solid var(--bg-secondary)', fontSize: isMobile ? '0.68rem' : undefined }}>
                                                <td style={{
                                                    padding: isMobile ? '0.42rem 0.6rem' : '0.8rem 1.5rem',
                                                    fontWeight: 500,
                                                    width: subjectColWidth,
                                                    maxWidth: subjectColWidth,
                                                    whiteSpace: isMobile ? 'nowrap' : undefined,
                                                    overflow: isMobile ? 'hidden' : undefined,
                                                    textOverflow: isMobile ? 'ellipsis' : undefined
                                                }}>
                                                    {onSelectSubject ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => onSelectSubject(row.name)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                padding: 0,
                                                            margin: 0,
                                                            cursor: 'pointer',
                                                            font: 'inherit',
                                                            color: 'var(--primary-color)',
                                                                textAlign: 'left',
                                                                display: 'block',
                                                                width: '100%',
                                                                whiteSpace: 'inherit',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}
                                                        >
                                                            {row.name}
                                                        </button>
                                                    ) : (
                                                        row.name
                                                    )}
                                                </td>
                                                {cols.cm && <td style={{ textAlign: 'right', ...compactCell }}>{row.cm > 0 ? row.cm.toFixed(1) : '-'}</td>}
                                                {cols.td && <td style={{ textAlign: 'right', ...compactCell }}>{row.td > 0 ? row.td.toFixed(1) : '-'}</td>}
                                                {cols.tp && <td style={{ textAlign: 'right', ...compactCell }}>{row.tp > 0 ? row.tp.toFixed(1) : '-'}</td>}
                                                {cols.project && <td style={{ textAlign: 'right', ...compactCell }}>{row.project > 0 ? row.project.toFixed(1) : '-'}</td>}
                                                <td style={{ textAlign: 'right', padding: isMobile ? '0.42rem 0.6rem' : '0.8rem 1.5rem', paddingLeft: isMobile ? '0.35rem' : undefined, fontWeight: 700, background: 'var(--bg-secondary)' }}>
                                                    {row.filteredTotal.toFixed(1)}
                                                </td>
                                                {cols.exam && <td style={{ textAlign: 'right', ...compactCell }}>{row.exam > 0 ? row.exam.toFixed(1) : '-'}</td>}
                                                {cols.reunion && <td style={{ textAlign: 'right', ...compactCell }}>{row.reunion > 0 ? row.reunion.toFixed(1) : '-'}</td>}
                                                {cols.other && <td style={{ textAlign: 'right', ...compactCell }}>{row.other > 0 ? row.other.toFixed(1) : '-'}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    );
                })
            )}

            <p style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0 1rem' }}>
                {t.smart_dedupe_note}
            </p>
        </div>
    );
}
