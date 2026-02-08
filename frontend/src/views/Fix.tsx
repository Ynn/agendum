import { useEffect, useMemo, useState } from 'react';
import type { EnrichedEvent } from '../types';
import { useT } from '../i18n';

type Category = 'teachers' | 'promos' | 'subjects';

interface Props {
  events: EnrichedEvent[];
  rules: {
    teachers: Record<string, string>;
    promos: Record<string, string>;
    subjects: Record<string, string>;
    hidden: {
      teachers: Record<string, boolean>;
      promos: Record<string, boolean>;
      subjects: Record<string, boolean>;
    };
  };
  onUpdateRules: (category: Category, from: string, to: string) => void;
  onRemoveRule: (category: Category, from: string) => void;
  onToggleHide: (category: Category, value: string) => void;
  onResetRules: () => void;
}

interface Entry {
  value: string;
  count: number;
  examples: string[];
}

export function Fix({ events, rules, onUpdateRules, onRemoveRule, onToggleHide, onResetRules }: Props) {
  const [tab, setTab] = useState<Category>('teachers');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [mergeTarget, setMergeTarget] = useState('');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const t = useT();

  const data = useMemo(() => {
    const add = (map: Map<string, Entry>, raw: string, example: string) => {
      const key = raw.trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, { value: key, count: 0, examples: [] });
      const entry = map.get(key)!;
      entry.count += 1;
      if (entry.examples.length < 3) entry.examples.push(example);
    };

    const teacherMap = new Map<string, Entry>();
    const promoMap = new Map<string, Entry>();
    const subjectMap = new Map<string, Entry>();

    events.forEach(ev => {
      const teacherStr = ev.extractedTeacher || '';
      teacherStr
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => Boolean(t))
        .forEach((t: string) => add(teacherMap, t, ev.subject || '')); // show subject as context

      const promoStr = ev.promo || '';
      if (promoStr) add(promoMap, promoStr, ev.subject || '');

      if (ev.subject) add(subjectMap, ev.subject, promoStr || teacherStr || '');
    });

    const toArray = (m: Map<string, Entry>) => Array.from(m.values()).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

    return {
      teachers: toArray(teacherMap),
      promos: toArray(promoMap),
      subjects: toArray(subjectMap)
    };
  }, [events]);

  const current = data[tab];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return current;
    return current.filter(entry =>
      entry.value.toLowerCase().includes(term) ||
      entry.examples.some(ex => ex.toLowerCase().includes(term))
    );
  }, [current, search]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedKey('');
      return;
    }
    if (!filtered.find(e => e.value === selectedKey)) {
      setSelectedKey(filtered[0].value);
    }
  }, [filtered, selectedKey]);

  const selectedEntry = filtered.find(e => e.value === selectedKey) || null;

  const placeholderFor = (val: string) => {
    if (tab === 'teachers') {
      const parts = val.split(' ');
      if (parts.length >= 2) return parts.slice(-2).join(' ');
    }
    if (tab === 'subjects') {
      return val.replace(/\s+IDBCI$/i, '').trim();
    }
    return '';
  };

  const apply = (from: string, toOverride?: string) => {
    const to = (toOverride ?? drafts[from] ?? rules[tab][from] ?? '').trim() || from;
    if (to === from) return;
    onUpdateRules(tab, from, to);
  };

  const toggleSelected = (val: string) => {
    setSelected(prev => ({ ...prev, [val]: !prev[val] }));
  };

  const mergeSelected = () => {
    const target = mergeTarget.trim();
    if (!target) return;
    const picks = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    picks.forEach(p => apply(p, target));
    setSelected({});
  };

  const mappingTarget = (val: string) => rules[tab][val];
  const isHidden = (val: string) => Boolean(rules.hidden[tab][val]);

  return (
    <div className="card full-height-view" style={{ padding: '1rem', height: '100%' }}>
      <div className="fix-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${tab === 'teachers' ? 'btn-primary' : ''}`} onClick={() => setTab('teachers')}>{t.fix_teachers}</button>
          <button className={`btn ${tab === 'promos' ? 'btn-primary' : ''}`} onClick={() => setTab('promos')}>{t.fix_promos}</button>
          <button className={`btn ${tab === 'subjects' ? 'btn-primary' : ''}`} onClick={() => setTab('subjects')}>{t.fix_subjects}</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={t.merge_selected_into}
            value={mergeTarget}
            onChange={e => setMergeTarget(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: '6px', minWidth: '220px' }}
          />
          <button className="btn" onClick={mergeSelected}>{t.merge}</button>
          <button className="btn" onClick={onResetRules}>{t.reset_fixes}</button>
        </div>
      </div>

      <p style={{ color: '#475569', marginBottom: '1rem' }}>{t.fix_hint}</p>

      <div className="fix-layout" style={{ minHeight: 0 }}>
        <div className="card fix-list">
          <div className="fix-list-header">
            <input
              type="text"
              placeholder={t.fix_search_placeholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="fix-list-meta">{filtered.length}/{current.length}</div>
          </div>
          <div className="fix-list-items">
            {filtered.map(entry => {
              const mapped = mappingTarget(entry.value);
              const hidden = isHidden(entry.value);
              return (
                <div
                  key={entry.value}
                  className={`fix-item ${selectedKey === entry.value ? 'active' : ''}`}
                  onClick={() => setSelectedKey(entry.value)}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[entry.value]}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelected(entry.value)}
                  />
                  <div className="fix-item-main">
                    <div className={`fix-item-title ${hidden ? 'hidden' : ''}`}>{entry.value}</div>
                    <div className="fix-item-sub">
                      <span>{t.count}: {entry.count}</span>
                      {mapped && <span>→ {mapped}</span>}
                      {hidden && <span className="fix-item-tag">{t.hidden_label}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card fix-detail">
          {!selectedEntry ? (
            <div style={{ color: '#94a3b8' }}>{t.fix_select_hint}</div>
          ) : (
            <>
              <div className="fix-detail-header">
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selectedEntry.value}</div>
                <div style={{ color: '#64748b' }}>{t.count}: {selectedEntry.count}</div>
              </div>

              <div className="fix-detail-section">
                <label>{t.rename_merge_into}</label>
                <input
                  type="text"
                  defaultValue={mappingTarget(selectedEntry.value) || ''}
                  placeholder={placeholderFor(selectedEntry.value)}
                  onChange={e => setDrafts(prev => ({ ...prev, [selectedEntry.value]: e.target.value }))}
                />
                <div className="fix-detail-actions">
                  <button className="btn" onClick={() => apply(selectedEntry.value)}>{t.apply}</button>
                  <button className="btn" onClick={() => setMergeTarget(selectedEntry.value)}>{t.use_as_target}</button>
                  <button
                    className="btn"
                    style={{ background: isHidden(selectedEntry.value) ? '#e2e8f0' : undefined }}
                    onClick={() => onToggleHide(tab, selectedEntry.value)}
                  >{isHidden(selectedEntry.value) ? t.unhide : t.hide}</button>
                  {mappingTarget(selectedEntry.value) && (
                    <button className="btn" onClick={() => onRemoveRule(tab, selectedEntry.value)}>✕</button>
                  )}
                </div>
              </div>

              <div className="fix-detail-section">
                <label>{t.examples}</label>
                <div className="fix-examples">
                  {selectedEntry.examples.map(ex => (
                    <div key={ex} className="fix-example">{ex}</div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
