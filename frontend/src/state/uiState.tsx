import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { initialFilters, type FilterState } from '../components/AdvancedFilters';
import { detectLang, type Lang } from '../i18n';

export type View = 'agenda' | 'courses' | 'stats' | 'settings' | 'search' | 'fix';
export type ThemeMode = 'system' | 'light' | 'dark';

type UiState = {
  view: View;
  courseSubject: string;
  searchQuery: string;
  showFilters: boolean;
  filters: FilterState;
  mobileMenuOpen: boolean;
  lang: Lang;
  selectedTeacher: string;
  themeMode: ThemeMode;
};

type Action =
  | { type: 'set_view'; value: View }
  | { type: 'set_course_subject'; value: string }
  | { type: 'set_search_query'; value: string }
  | { type: 'set_show_filters'; value: boolean }
  | { type: 'set_filters'; value: FilterState }
  | { type: 'set_mobile_menu_open'; value: boolean }
  | { type: 'set_lang'; value: Lang }
  | { type: 'set_selected_teacher'; value: string }
  | { type: 'set_theme_mode'; value: ThemeMode }
  | { type: 'reset_after_purge' };

type UiActions = {
  setView: (value: View) => void;
  setCourseSubject: (value: string) => void;
  setSearchQuery: (value: string) => void;
  setShowFilters: (value: boolean) => void;
  setFilters: (value: FilterState) => void;
  setMobileMenuOpen: (value: boolean) => void;
  setLang: (value: Lang) => void;
  setSelectedTeacher: (value: string) => void;
  setThemeMode: (value: ThemeMode) => void;
  resetAfterPurge: () => void;
};

type UiStore = {
  state: UiState;
  actions: UiActions;
};

const UiStateContext = createContext<UiStore | null>(null);

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem('agendum_lang');
    if (saved === 'fr' || saved === 'en') return saved;
  } catch {
    // ignore
  }
  return detectLang();
}

function getInitialThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem('agendum_theme_mode');
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return 'system';
}

function getInitialSelectedTeacher(): string {
  try {
    return localStorage.getItem('agendum_teacher') || '';
  } catch {
    return '';
  }
}

function createInitialState(): UiState {
  return {
    view: 'agenda',
    courseSubject: '',
    searchQuery: '',
    showFilters: false,
    filters: initialFilters,
    mobileMenuOpen: false,
    lang: getInitialLang(),
    selectedTeacher: getInitialSelectedTeacher(),
    themeMode: getInitialThemeMode(),
  };
}

function reducer(state: UiState, action: Action): UiState {
  switch (action.type) {
    case 'set_view':
      return { ...state, view: action.value };
    case 'set_course_subject':
      return { ...state, courseSubject: action.value };
    case 'set_search_query':
      return { ...state, searchQuery: action.value };
    case 'set_show_filters':
      return { ...state, showFilters: action.value };
    case 'set_filters':
      return { ...state, filters: action.value };
    case 'set_mobile_menu_open':
      return { ...state, mobileMenuOpen: action.value };
    case 'set_lang':
      return { ...state, lang: action.value };
    case 'set_selected_teacher':
      return { ...state, selectedTeacher: action.value };
    case 'set_theme_mode':
      return { ...state, themeMode: action.value };
    case 'reset_after_purge':
      return {
        ...state,
        view: 'settings',
        courseSubject: '',
        searchQuery: '',
        filters: initialFilters,
        showFilters: false,
        mobileMenuOpen: false,
        selectedTeacher: '',
      };
    default:
      return state;
  }
}

export function UiStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const actions = useMemo<UiActions>(() => ({
    setView: (value) => dispatch({ type: 'set_view', value }),
    setCourseSubject: (value) => dispatch({ type: 'set_course_subject', value }),
    setSearchQuery: (value) => dispatch({ type: 'set_search_query', value }),
    setShowFilters: (value) => dispatch({ type: 'set_show_filters', value }),
    setFilters: (value) => dispatch({ type: 'set_filters', value }),
    setMobileMenuOpen: (value) => dispatch({ type: 'set_mobile_menu_open', value }),
    setLang: (value) => dispatch({ type: 'set_lang', value }),
    setSelectedTeacher: (value) => dispatch({ type: 'set_selected_teacher', value }),
    setThemeMode: (value) => dispatch({ type: 'set_theme_mode', value }),
    resetAfterPurge: () => dispatch({ type: 'reset_after_purge' }),
  }), []);

  const value = useMemo<UiStore>(() => ({ state, actions }), [state, actions]);
  return <UiStateContext.Provider value={value}>{children}</UiStateContext.Provider>;
}

export function useUiState() {
  const ctx = useContext(UiStateContext);
  if (!ctx) {
    throw new Error('useUiState must be used inside UiStateProvider');
  }
  return ctx;
}
