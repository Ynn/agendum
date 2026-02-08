import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import type { Calendar, NormalizedEvent } from './types';
import { AdvancedFilters } from './components/AdvancedFilters';
import { LangContext, strings } from './i18n';
import {
  createDefaultNormalizationRules,
  useCalendarPersistence,
  type NormalizationRules,
} from './hooks/useCalendarPersistence';
import { useRemoteCalendars } from './hooks/useRemoteCalendars';
import { useDerivedEvents } from './hooks/useDerivedEvents';
import { useIcsParserWorker } from './hooks/useIcsParserWorker';
import { UiStateProvider, useUiState, type View } from './state/uiState';
import './index.css';

const CALENDAR_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
type ResolvedTheme = 'light' | 'dark';

const Agenda = lazy(async () => {
  const module = await import('./views/Agenda');
  return { default: module.Agenda };
});
const ServiceDashboard = lazy(async () => {
  const module = await import('./views/ServiceDashboard');
  return { default: module.ServiceDashboard };
});
const Settings = lazy(async () => {
  const module = await import('./views/Settings');
  return { default: module.Settings };
});
const CourseExplorer = lazy(async () => {
  const module = await import('./views/CourseExplorer');
  return { default: module.CourseExplorer };
});
const Fix = lazy(async () => {
  const module = await import('./views/Fix');
  return { default: module.Fix };
});
const SearchResults = lazy(async () => {
  const module = await import('./views/SearchResults');
  return { default: module.SearchResults };
});

function AppContent() {
  const {
    loadPersistedState,
    savePersistedCalendars,
    savePersistedRules,
    purgePersistedState,
  } = useCalendarPersistence();
  const { state: ui, actions: uiActions } = useUiState();
  const {
    view,
    courseSubject,
    searchQuery,
    showFilters,
    filters,
    mobileMenuOpen,
    lang,
    selectedTeacher,
    themeMode,
  } = ui;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const {
    setView,
    setCourseSubject,
    setSearchQuery,
    setShowFilters,
    setFilters,
    setMobileMenuOpen,
    setLang,
    setSelectedTeacher,
    setThemeMode,
    resetAfterPurge,
  } = uiActions;

  const {
    isReady: isParserReady,
    initError: parserInitError,
    parseIcsDetailed,
  } = useIcsParserWorker();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const historyReadyRef = useRef(false);
  const isPopRef = useRef(false);
  const prevCourseSubjectRef = useRef(courseSubject);
  const [mainCalendarId, setMainCalendarId] = useState<string | null>(null);
  const [normalizationRules, setNormalizationRules] = useState<NormalizationRules>(() => createDefaultNormalizationRules());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1024px)').matches;
  });

  const handleCourseSubjectJump = (subject: string) => {
    if (!subject) return;
    setCourseSubject(subject);
    setView('courses');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as { agendum?: boolean; view?: View; courseSubject?: string } | null;
      if (!state?.agendum) return;
      isPopRef.current = true;
      setView(state.view ?? 'agenda');
      setCourseSubject(state.courseSubject ?? '');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setCourseSubject, setView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextState = { agendum: true, view, courseSubject };
    if (!historyReadyRef.current) {
      window.history.replaceState(nextState, '');
      historyReadyRef.current = true;
      prevCourseSubjectRef.current = courseSubject;
      return;
    }
    if (isPopRef.current) {
      isPopRef.current = false;
      prevCourseSubjectRef.current = courseSubject;
      return;
    }
    const prevSubject = prevCourseSubjectRef.current;
    const clearedSubject = prevSubject && !courseSubject && view === 'courses';
    if (clearedSubject) {
      window.history.replaceState(nextState, '');
    } else {
      window.history.pushState(nextState, '');
    }
    prevCourseSubjectRef.current = courseSubject;
  }, [view, courseSubject]);

  const t = strings[lang] ?? strings.en;
  const filtersActive = useMemo(() => {
    if (filters.dateStart || filters.dateEnd || filters.startTime || filters.endTime) return true;
    if (filters.source !== 'service') return true;
    if (filters.days.length !== 7) return true;
    return false;
  }, [filters]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqMobile = window.matchMedia('(max-width: 768px)');
    const mqTablet = window.matchMedia('(max-width: 1024px)');
    const onMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const onTabletChange = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    setIsMobile(mqMobile.matches);
    setIsTablet(mqTablet.matches);
    mqMobile.addEventListener('change', onMobileChange);
    mqTablet.addEventListener('change', onTabletChange);
    return () => {
      mqMobile.removeEventListener('change', onMobileChange);
      mqTablet.removeEventListener('change', onTabletChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [isMobile, mobileMenuOpen, setMobileMenuOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('agendum_lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem('agendum_theme_mode', themeMode);
    } catch {
      // ignore
    }
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      if (themeMode === 'system') {
        setResolvedTheme(mq.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(themeMode);
      }
    };
    updateTheme();
    const onChange = () => updateTheme();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeMode]);

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.colorScheme = resolvedTheme;
    } catch {
      // ignore
    }
  }, [resolvedTheme]);

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem('agendum_teacher', selectedTeacher);
    } catch {
      // ignore
    }
  }, [selectedTeacher]);

  useEffect(() => {
    (async () => {
      const persisted = await loadPersistedState(CALENDAR_COLORS[0]);
      setCalendars(persisted.calendars);
      setMainCalendarId(persisted.mainCalendarId);
      setNormalizationRules(persisted.normalizationRules);
    })();
  }, [loadPersistedState]);

  useEffect(() => {
    void savePersistedRules(normalizationRules);
  }, [normalizationRules, savePersistedRules]);

  const handleImport = useCallback((
    name: string,
    events: NormalizedEvent[],
    isService: boolean,
    sourceUrl?: string,
    lastSyncedAt?: number,
    lastWarning?: string | null,
  ) => {
    const newId = Date.now().toString();
    const newCal: Calendar = {
      id: newId,
      name,
      color: CALENDAR_COLORS[calendars.length % CALENDAR_COLORS.length],
      visible: calendars.length === 0,
      includeInStats: isService,
      events,
      remote: sourceUrl
        ? {
          sourceUrl,
          lastSyncedAt: lastSyncedAt ?? Date.now(),
          lastAttemptAt: lastSyncedAt ?? Date.now(),
          lastManualRefreshAt: null,
          lastError: null,
          lastWarning: lastWarning ?? null,
        }
        : undefined,
    };
    const updated = [...calendars, newCal];
    setCalendars(updated);

    const newMain = calendars.length === 0 ? newId : mainCalendarId;
    if (calendars.length === 0 && newMain) setMainCalendarId(newMain);

    void savePersistedCalendars(updated, newMain || undefined);
  }, [calendars, mainCalendarId, savePersistedCalendars]);

  const { handleImportFromUrl, refreshRemoteCalendar } = useRemoteCalendars({
    calendars,
    isParserReady,
    lang,
    parseIcsDetailed,
    setCalendars,
    savePersistedCalendars,
    onImport: handleImport,
  });

  const handleRemoveCalendar = (id: string) => {
    const updated = calendars.filter(c => c.id !== id);
    setCalendars(updated);
    if (mainCalendarId === id) setMainCalendarId(null);
    void savePersistedCalendars(updated, mainCalendarId === id ? '' : undefined);
  };

  const handleToggleCalendar = (id: string) => {
    const updated = calendars.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
    setCalendars(updated);
    void savePersistedCalendars(updated);
  };

  const handleToggleStats = (id: string) => {
    const updated = calendars.map(c => c.id === id ? { ...c, includeInStats: !c.includeInStats } : c);
    setCalendars(updated);
    void savePersistedCalendars(updated);
  };

  const handleRenameCalendar = (id: string, name: string) => {
    const updated = calendars.map((c) => c.id === id ? { ...c, name } : c);
    setCalendars(updated);
    void savePersistedCalendars(updated);
  };

  const handlePurgeAll = async () => {
    if (!window.confirm(t.purge_all_confirm)) return;
    await purgePersistedState();
    try {
      localStorage.removeItem('agendum_teacher');
    } catch {
      // ignore
    }

    setCalendars([]);
    setMainCalendarId(null);
    setNormalizationRules(createDefaultNormalizationRules());
    resetAfterPurge();
  };

  const {
    allEvents,
    serviceEvents,
    teacherOptions,
    courseEvents,
    scheduleEvents,
    searchResults,
  } = useDerivedEvents({
    calendars,
    normalizationRules,
    filters,
    mainCalendarId,
    searchQuery: deferredSearchQuery,
  });

  const onSearch = (value: string) => {
    setSearchQuery(value);
    if (value && view !== 'search') setView('search');
  };

  if (!isParserReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
        {parserInitError || t.loading_core}
      </div>
    );
  }

  return (
    <LangContext.Provider value={lang}>
      <div className="app-container">
        <AppHeader
          isMobile={isMobile}
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          view={view}
          onViewChange={setView}
          searchQuery={searchQuery}
          onSearch={onSearch}
          filtersActive={filtersActive}
          onOpenFilters={() => setShowFilters(true)}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          lang={lang}
          onLangChange={setLang}
          t={t}
        />

        <main className="main-content" style={{
          padding: isMobile ? '0.12rem 0.24rem var(--bottom-nav-offset)' : '0.5rem 2.5vw 80px',
          maxWidth: '100%',
          margin: '0 auto',
          width: '100%'
        }}>
          <Suspense fallback={<div style={{ padding: '1rem', color: 'var(--text-muted)' }}>{t.loading_core}</div>}>
            <div className="view-shell">
              {view === 'agenda' && (
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
                  {!mainCalendarId && (
                    <div style={{ padding: '1rem', background: '#fffbeb', color: '#b45309', borderRadius: 'var(--radius)', marginBottom: '1rem', border: '1px solid #fcd34d' }}>
                      ⚠️ {t.no_main_schedule} {t.go_settings_prefix} <button onClick={() => setView('settings')} style={{ textDecoration: 'underline', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>{t.settings}</button> {t.go_settings_suffix}
                    </div>
                  )}
                  <Agenda events={scheduleEvents} isMobile={isMobile} />
                </div>
              )}

              {view === 'courses' && (
                <CourseExplorer
                  events={courseEvents}
                  isMobile={isMobile}
                  isTablet={isTablet && !isMobile}
                  selectedSubject={courseSubject}
                  onSubjectChange={setCourseSubject}
                />
              )}

              {view === 'stats' && (
                <ServiceDashboard
                  events={serviceEvents}
                  selectedTeacher={selectedTeacher}
                  isMobile={isMobile}
                  onSelectSubject={handleCourseSubjectJump}
                />
              )}

              {view === 'fix' && (
                <Fix
                  events={allEvents}
                  rules={normalizationRules}
                  onUpdateRules={(category, fromValue, toValue) => {
                    setNormalizationRules(prev => ({
                      ...prev,
                      [category]: { ...prev[category], [fromValue]: toValue },
                      hidden: { ...prev.hidden }
                    }));
                  }}
                  onRemoveRule={(category, fromValue) => {
                    setNormalizationRules(prev => {
                      const updated = { ...prev[category] } as Record<string, string>;
                      delete updated[fromValue];
                      return { ...prev, [category]: updated } as NormalizationRules;
                    });
                  }}
                  onToggleHide={(category, value) => {
                    setNormalizationRules(prev => ({
                      ...prev,
                      hidden: {
                        ...prev.hidden,
                        [category]: {
                          ...prev.hidden[category],
                          [value]: !prev.hidden[category][value]
                        }
                      }
                    }));
                  }}
                  onResetRules={() => setNormalizationRules(createDefaultNormalizationRules())}
                />
              )}

              {view === 'settings' && (
                <Settings
                  calendars={calendars}
                  teacherOptions={teacherOptions}
                  selectedTeacher={selectedTeacher}
                  isMobile={isMobile}
                  themeMode={themeMode}
                  onSelectTeacher={setSelectedTeacher}
                  onThemeModeChange={setThemeMode}
                  onPurgeAll={handlePurgeAll}
                  onOpenFix={() => setView('fix')}
                  onImport={handleImport}
                  parseIcsDetailed={parseIcsDetailed}
                  onImportFromUrl={handleImportFromUrl}
                  onRemove={handleRemoveCalendar}
                  onToggle={handleToggleCalendar}
                  onToggleStats={handleToggleStats}
                  onRenameCalendar={handleRenameCalendar}
                  onRefreshCalendar={async (id) => {
                    await refreshRemoteCalendar(id, true);
                  }}
                />
              )}

              {view === 'search' && (
                <SearchResults events={searchResults} query={searchQuery} isMobile={isMobile} />
              )}
            </div>
          </Suspense>
        </main>

        <AdvancedFilters
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onApply={setFilters}
          currentFilters={filters}
        />

        <BottomNav
          isMobile={isMobile}
          lang={lang}
          t={t}
          view={view}
          onViewChange={setView}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />
      </div>
    </LangContext.Provider>
  );
}

export default function App() {
  return (
    <UiStateProvider>
      <AppContent />
    </UiStateProvider>
  );
}
