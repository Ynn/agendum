import { useEffect, useMemo, useState, useCallback } from 'react';
import type { EnrichedEvent } from '../types';
import { useLang, useT } from '../i18n';

interface Props {
    events: EnrichedEvent[];
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
    const [serviceScope, setServiceScope] = useState<'total' | 'done' | 'todo'>('total');
    const [nowTs, setNowTs] = useState(() => Date.now());

    const splitTeacherNames = useCallback((value?: string) => {
        if (!value) return [];
        return value
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
    }, []);

    const isUnknownTeacherToken = useCallback((value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return true;
        if (trimmed === '—') return true;
        const lower = trimmed.toLowerCase();
        return lower === 'unknown teacher' || lower === t.unknown_teacher.toLowerCase();
    }, [t.unknown_teacher]);

    const unknownTeacherLabel = useMemo(() => (
        selectedTeacher ? '—' : t.unknown_teacher
    ), [selectedTeacher, t.unknown_teacher]);

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

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const id = window.setInterval(() => setNowTs(Date.now()), 60000);
        return () => window.clearInterval(id);
    }, []);

    const baseEvents = useMemo(() => {
        const teacherFiltered = !selectedTeacher
            ? events
            : (() => {
                const target = selectedTeacher.toLowerCase();
                return events.filter(ev => {
                    const teacherStr = (ev.extractedTeacher || '').toLowerCase();
                    const teacherTokens = splitTeacherNames(teacherStr);
                    const matchesSelected = teacherTokens.some(name => name.toLowerCase() === target);
                    const isUnknown = teacherTokens.length === 0 || teacherTokens.every(isUnknownTeacherToken);
                    return matchesSelected || isUnknown;
                });
            })();

        if (serviceScope === 'total') return teacherFiltered;

        return teacherFiltered.filter(ev => {
            const start = ev.start_date;
            const end = ev.end_date;
            const startMs = start?.getTime();
            const endMs = end?.getTime();

            if (typeof endMs === 'number' && Number.isFinite(endMs)) {
                return serviceScope === 'done' ? endMs <= nowTs : endMs > nowTs;
            }
            if (typeof startMs === 'number' && Number.isFinite(startMs)) {
                return serviceScope === 'done' ? startMs <= nowTs : startMs > nowTs;
            }
            return false;
        });
    }, [events, selectedTeacher, serviceScope, nowTs, splitTeacherNames, isUnknownTeacherToken]);

    const summary = useMemo(() => {
        const totals = { cm: 0, td: 0, tp: 0, project: 0, reunion: 0, exam: 0, other: 0 };
        baseEvents.forEach(ev => {
            if (ev.is_duplicate) return;
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
            if (ev.is_duplicate) return;

            const teacherStr = (ev.extractedTeacher || '').trim();
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
    }, [baseEvents, cols, showEmpty, t.unknown_subject, selectedTeacher, splitTeacherNames, isUnknownTeacherToken, unknownTeacherLabel]);

    return (
        <div className={`service-dashboard fade-in page-scroll ${isMobile ? 'service-dashboard--mobile' : ''}`}>
            {/* Controls */}
            <div className={`card service-dashboard__controls ${isMobile ? 'service-dashboard__controls--mobile' : ''}`}>
                <div className={`service-dashboard__controls-left ${isMobile ? 'service-dashboard__controls-left--mobile' : ''}`}>
                    {selectedTeacher && (
                        <div className={`service-dashboard__selected-teacher ${isMobile ? 'service-dashboard__selected-teacher--mobile' : ''}`}>
                            {t.teacher}: <strong>{selectedTeacher}</strong>
                        </div>
                    )}
                    <div className={`service-dashboard__col-toggles ${isMobile ? 'service-dashboard__col-toggles--mobile' : ''}`}>
                        {colKeys.map(key => (
                            <label key={key} className={`service-dashboard__col-toggle ${isMobile ? 'service-dashboard__col-toggle--mobile' : ''}`}>
                                <input type="checkbox" checked={cols[key]} onChange={e => setCols({ ...cols, [key]: e.target.checked })} />
                                {colLabels[key]}
                            </label>
                        ))}
                    </div>
                </div>
                <div className={`service-dashboard__scope ${isMobile ? 'service-dashboard__scope--mobile' : ''}`}>
                    <span className={`service-dashboard__scope-label ${isMobile ? 'service-dashboard__scope-label--mobile' : ''}`}>
                        {t.service_period_label}
                    </span>
                    <div className={`service-dashboard__scope-options ${isMobile ? 'service-dashboard__scope-options--mobile' : ''}`}>
                        {([
                            { key: 'total', label: t.service_period_total },
                            { key: 'done', label: t.service_period_done },
                            { key: 'todo', label: t.service_period_todo }
                        ] as const).map(opt => (
                            <button
                                key={opt.key}
                                type="button"
                                className={`btn service-dashboard__scope-btn ${serviceScope === opt.key ? 'btn-primary' : ''} ${isMobile ? 'service-dashboard__scope-btn--mobile' : ''}`}
                                onClick={() => setServiceScope(opt.key)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {teacherStats.length > 1 && (
                <>
                    <div className={`service-dashboard__aggregate-label ${isMobile ? 'service-dashboard__aggregate-label--mobile' : ''}`}>
                        {lang === 'fr' ? 'Total de tous les services affichés' : 'Total of all displayed services'}
                    </div>
                    <div className={`card service-dashboard__aggregate-card ${isMobile ? 'service-dashboard__aggregate-card--mobile' : ''}`}>
                        <div className={`service-dashboard__summary-panel ${isMobile ? 'service-dashboard__summary-panel--mobile' : ''}`}>
                            <div className={`service-dashboard__summary-core ${isMobile ? 'service-dashboard__summary-core--mobile' : ''}`}>
                                <div className="service-dashboard__summary-stat">
                                    <span className="service-dashboard__summary-icon">⏱️</span>
                                    <div>
                                        <div className="service-dashboard__summary-stat-label">{t.total_core_label}</div>
                                        <div className="service-dashboard__summary-value">{summary.totalCore.toFixed(1)}h</div>
                                    </div>
                                </div>
                                <div className="service-dashboard__summary-stat">
                                    <span className="service-dashboard__summary-icon">∑</span>
                                    <div>
                                        <div className="service-dashboard__summary-stat-label">{t.total_with_project_label}</div>
                                        <div className="service-dashboard__summary-value">{summary.totalTeaching.toFixed(1)}h</div>
                                    </div>
                                </div>
                            </div>
                            <div className="service-dashboard__summary-stat">
                                <span className="service-dashboard__summary-icon">📖</span>
                                <div>
                                    <div className="service-dashboard__summary-stat-label">CM</div>
                                    <div className="service-dashboard__summary-value service-dashboard__summary-value--cm">{summary.cm.toFixed(1)}h</div>
                                </div>
                            </div>
                            <div className="service-dashboard__summary-stat">
                                <span className="service-dashboard__summary-icon">✏️</span>
                                <div>
                                    <div className="service-dashboard__summary-stat-label">TD</div>
                                    <div className="service-dashboard__summary-value service-dashboard__summary-value--td">{summary.td.toFixed(1)}h</div>
                                </div>
                            </div>
                            <div className="service-dashboard__summary-stat">
                                <span className="service-dashboard__summary-icon">🔬</span>
                                <div>
                                    <div className="service-dashboard__summary-stat-label">TP</div>
                                    <div className="service-dashboard__summary-value service-dashboard__summary-value--tp">{summary.tp.toFixed(1)}h</div>
                                </div>
                            </div>
                            <div className="service-dashboard__summary-stat">
                                <span className="service-dashboard__summary-icon">🧩</span>
                                <div>
                                    <div className="service-dashboard__summary-stat-label">{t.project}</div>
                                    <div className="service-dashboard__summary-value service-dashboard__summary-value--project">{summary.project.toFixed(1)}h</div>
                                </div>
                            </div>
                            <div className={`service-dashboard__summary-extra ${isMobile ? 'service-dashboard__summary-extra--mobile' : ''}`}>
                                <div className="service-dashboard__summary-extra-title">{lang === 'fr' ? 'Non compté' : 'Not counted'}</div>
                                <div className="service-dashboard__summary-extra-list">
                                    <div>🧪 {t.exam}: {summary.exam.toFixed(1)}h</div>
                                    <div>🗓️ {t.reunion}: {summary.reunion.toFixed(1)}h</div>
                                    <div>📌 {t.other}: {summary.other.toFixed(1)}h</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Teacher Sections */}
            {teacherStats.length === 0 ? (
                <div className="card service-dashboard__empty">
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
                        <section key={teacher.name} className="card service-dashboard__teacher-section">
                            <div className={`service-dashboard__teacher-header ${isMobile ? 'service-dashboard__teacher-header--mobile' : ''}`}>
                                <h2 className={`service-dashboard__teacher-name ${isMobile ? 'service-dashboard__teacher-name--mobile' : ''}`}>{teacher.name}</h2>
                                <div className={`service-dashboard__teacher-total ${isMobile ? 'service-dashboard__teacher-total--mobile' : ''}`}>
                                    {teacher.grandTotal.toFixed(1)} h
                                </div>
                            </div>

                            <div className={`service-dashboard__teacher-summary-wrap ${isMobile ? 'service-dashboard__teacher-summary-wrap--mobile' : ''}`}>
                                <div className={`service-dashboard__summary-panel ${isMobile ? 'service-dashboard__summary-panel--mobile' : ''}`}>
                                    <div className={`service-dashboard__summary-core ${isMobile ? 'service-dashboard__summary-core--mobile' : ''}`}>
                                        <div className="service-dashboard__summary-stat">
                                            <span className="service-dashboard__summary-icon">⏱️</span>
                                            <div>
                                                <div className="service-dashboard__summary-stat-label">{t.total_core_label}</div>
                                                <div className="service-dashboard__summary-value service-dashboard__summary-value--teacher">{totalCore.toFixed(1)}h</div>
                                            </div>
                                        </div>
                                        <div className="service-dashboard__summary-stat">
                                            <span className="service-dashboard__summary-icon">∑</span>
                                            <div>
                                                <div className="service-dashboard__summary-stat-label">{t.total_with_project_label}</div>
                                                <div className="service-dashboard__summary-value service-dashboard__summary-value--teacher">{totalTeaching.toFixed(1)}h</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="service-dashboard__summary-stat">
                                        <span className="service-dashboard__summary-icon">📖</span>
                                        <div>
                                            <div className="service-dashboard__summary-stat-label">CM</div>
                                            <div className="service-dashboard__summary-value service-dashboard__summary-value--teacher service-dashboard__summary-value--cm">{totals.cm.toFixed(1)}h</div>
                                        </div>
                                    </div>
                                    <div className="service-dashboard__summary-stat">
                                        <span className="service-dashboard__summary-icon">✏️</span>
                                        <div>
                                            <div className="service-dashboard__summary-stat-label">TD</div>
                                            <div className="service-dashboard__summary-value service-dashboard__summary-value--teacher service-dashboard__summary-value--td">{totals.td.toFixed(1)}h</div>
                                        </div>
                                    </div>
                                    <div className="service-dashboard__summary-stat">
                                        <span className="service-dashboard__summary-icon">🔬</span>
                                        <div>
                                            <div className="service-dashboard__summary-stat-label">TP</div>
                                            <div className="service-dashboard__summary-value service-dashboard__summary-value--teacher service-dashboard__summary-value--tp">{totals.tp.toFixed(1)}h</div>
                                        </div>
                                    </div>
                                    <div className="service-dashboard__summary-stat">
                                        <span className="service-dashboard__summary-icon">🧩</span>
                                        <div>
                                            <div className="service-dashboard__summary-stat-label">{t.project}</div>
                                            <div className="service-dashboard__summary-value service-dashboard__summary-value--teacher service-dashboard__summary-value--project">{totals.project.toFixed(1)}h</div>
                                        </div>
                                    </div>
                                    <div className={`service-dashboard__summary-extra ${isMobile ? 'service-dashboard__summary-extra--mobile' : ''}`}>
                                        <div className="service-dashboard__summary-extra-title">{lang === 'fr' ? 'Non compté' : 'Not counted'}</div>
                                        <div className="service-dashboard__summary-extra-list">
                                            <div>🧪 {t.exam}: {totals.exam.toFixed(1)}h</div>
                                            <div>🗓️ {t.reunion}: {totals.reunion.toFixed(1)}h</div>
                                            <div>📌 {t.other}: {totals.other.toFixed(1)}h</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="table-container service-table-container">
                                <table className={`service-dashboard__table ${isMobile ? 'service-dashboard__table--mobile' : ''}`} style={{ minWidth: tableMinWidth }}>
                                    <thead>
                                        <tr className={`service-dashboard__head-row ${isMobile ? 'service-dashboard__head-row--mobile' : ''}`}>
                                            <th className={`service-dashboard__subject-head ${isMobile ? 'service-dashboard__subject-head--mobile' : ''}`} style={{
                                                width: subjectColWidth,
                                                maxWidth: subjectColWidth
                                            }}>
                                                {isMobile ? t.subject_short : t.subject}
                                            </th>
                                            {cols.cm && <th className={`service-dashboard__num-head ${isMobile ? 'service-dashboard__num-head--mobile' : ''}`}>CM</th>}
                                            {cols.td && <th className={`service-dashboard__num-head ${isMobile ? 'service-dashboard__num-head--mobile' : ''}`}>TD</th>}
                                            {cols.tp && <th className={`service-dashboard__num-head ${isMobile ? 'service-dashboard__num-head--mobile' : ''}`}>TP</th>}
                                            {cols.project && <th className={`service-dashboard__num-head ${isMobile ? 'service-dashboard__num-head--mobile' : ''}`}>{isMobile ? t.project_short : t.project}</th>}
                                            <th className={`service-dashboard__total-head ${isMobile ? 'service-dashboard__total-head--mobile' : ''}`}>{isMobile ? t.total_short : t.total}</th>
                                            {cols.exam && <th className={`service-dashboard__num-head service-dashboard__num-head--wide ${isMobile ? 'service-dashboard__num-head--mobile' : ''}`}>{isMobile ? t.exam_short : t.exam}</th>}
                                            {cols.reunion && <th className={`service-dashboard__num-head service-dashboard__num-head--wide ${isMobile ? 'service-dashboard__num-head--mobile' : ''}`}>{t.reunion}</th>}
                                            {cols.other && <th className={`service-dashboard__num-head service-dashboard__num-head--wide ${isMobile ? 'service-dashboard__num-head--mobile' : ''}`}>{isMobile ? t.other_short : t.other}</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teacher.subjectList.map(row => (
                                            <tr key={row.name} className={`service-dashboard__row ${isMobile ? 'service-dashboard__row--mobile' : ''}`}>
                                                <td className={`service-dashboard__subject-cell ${isMobile ? 'service-dashboard__subject-cell--mobile' : ''}`} style={{
                                                    width: subjectColWidth,
                                                    maxWidth: subjectColWidth
                                                }}>
                                                    {onSelectSubject ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => onSelectSubject(row.name)}
                                                            className="service-dashboard__subject-link"
                                                        >
                                                            {row.name}
                                                        </button>
                                                    ) : (
                                                        row.name
                                                    )}
                                                </td>
                                                {cols.cm && <td className={`service-dashboard__num-cell ${isMobile ? 'service-dashboard__num-cell--mobile' : ''}`}>{row.cm > 0 ? row.cm.toFixed(1) : '-'}</td>}
                                                {cols.td && <td className={`service-dashboard__num-cell ${isMobile ? 'service-dashboard__num-cell--mobile' : ''}`}>{row.td > 0 ? row.td.toFixed(1) : '-'}</td>}
                                                {cols.tp && <td className={`service-dashboard__num-cell ${isMobile ? 'service-dashboard__num-cell--mobile' : ''}`}>{row.tp > 0 ? row.tp.toFixed(1) : '-'}</td>}
                                                {cols.project && <td className={`service-dashboard__num-cell ${isMobile ? 'service-dashboard__num-cell--mobile' : ''}`}>{row.project > 0 ? row.project.toFixed(1) : '-'}</td>}
                                                <td className={`service-dashboard__total-cell ${isMobile ? 'service-dashboard__total-cell--mobile' : ''}`}>
                                                    {row.filteredTotal.toFixed(1)}
                                                </td>
                                                {cols.exam && <td className={`service-dashboard__num-cell ${isMobile ? 'service-dashboard__num-cell--mobile' : ''}`}>{row.exam > 0 ? row.exam.toFixed(1) : '-'}</td>}
                                                {cols.reunion && <td className={`service-dashboard__num-cell ${isMobile ? 'service-dashboard__num-cell--mobile' : ''}`}>{row.reunion > 0 ? row.reunion.toFixed(1) : '-'}</td>}
                                                {cols.other && <td className={`service-dashboard__num-cell ${isMobile ? 'service-dashboard__num-cell--mobile' : ''}`}>{row.other > 0 ? row.other.toFixed(1) : '-'}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    );
                })
            )}

            <p className="service-dashboard__dedupe-note">
                {t.smart_dedupe_note}
            </p>
        </div>
    );
}
