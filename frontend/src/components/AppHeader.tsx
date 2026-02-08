import { type Lang, strings } from '../i18n';
import type { ThemeMode, View } from '../state/uiState';

type I18nStrings = (typeof strings)[Lang];

interface Props {
  isMobile: boolean;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  view: View;
  onViewChange: (view: View) => void;
  searchQuery: string;
  onSearch: (value: string) => void;
  filtersActive: boolean;
  onOpenFilters: () => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  t: I18nStrings;
}

export function AppHeader({
  isMobile,
  mobileMenuOpen,
  onToggleMobileMenu,
  view,
  onViewChange,
  searchQuery,
  onSearch,
  filtersActive,
  onOpenFilters,
  themeMode,
  onThemeModeChange,
  lang,
  onLangChange,
  t,
}: Props) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--card-bg)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-color)',
      padding: isMobile ? '0.45rem 0.55rem' : '0.8rem 1rem',
      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem', flexWrap: 'wrap',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }}>
      {!isMobile && (
        <>
          <div
            style={{ fontWeight: 800, fontSize: '1.2rem', background: 'linear-gradient(45deg, #2563eb, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }}
            onClick={() => onViewChange('agenda')}
          >
            {t.app_name.toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: '280px', maxWidth: '700px', margin: '0 1rem', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder={`🔍 ${t.search_placeholder}`}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              style={{
                flex: 1, padding: '0.6rem 1rem', borderRadius: '20px',
                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', outline: 'none',
                color: 'var(--text-color)',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.background = 'var(--card-bg)'}
              onBlur={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
            />
            <button
              onClick={onOpenFilters}
              className={`btn ${filtersActive ? 'btn-primary' : ''}`}
              style={{ borderRadius: '20px', padding: '0 1rem' }}
            >
              {t.filters} ⇩
            </button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.theme}</span>
            <select
              value={themeMode}
              onChange={(e) => onThemeModeChange(e.target.value as ThemeMode)}
              style={{ padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)' }}
            >
              <option value="system">{t.theme_system}</option>
              <option value="light">{t.theme_light}</option>
              <option value="dark">{t.theme_dark}</option>
            </select>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.language}</span>
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value as Lang)}
              style={{ padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)' }}
            >
              <option value="fr">{t.language_fr}</option>
              <option value="en">{t.language_en}</option>
            </select>
          </div>
        </>
      )}

      {isMobile && (
        <>
          <div
            style={{ fontWeight: 800, fontSize: '0.95rem', background: 'linear-gradient(45deg, #2563eb, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }}
            onClick={() => onViewChange('agenda')}
          >
            {t.app_name}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              className={`btn ${mobileMenuOpen ? 'btn-primary' : ''}`}
              style={{ padding: '0.2rem 0.45rem', fontSize: '0.78rem' }}
              onClick={onToggleMobileMenu}
              title={lang === 'fr' ? 'Menu' : 'Menu'}
            >
              ☰
            </button>
          </div>

          {view === 'search' && (
            <div style={{ width: '100%', display: 'flex', gap: '0.35rem' }}>
              <input
                type="text"
                placeholder={`🔍 ${t.search_placeholder}`}
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.65rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  outline: 'none',
                  fontSize: '0.86rem',
                  color: 'var(--text-color)'
                }}
              />
              <button
                className={`btn ${filtersActive ? 'btn-primary' : ''}`}
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                onClick={onOpenFilters}
              >
                {t.filters}
              </button>
            </div>
          )}

          {mobileMenuOpen && (
            <div style={{
              width: '100%',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.5rem',
              background: 'var(--card-bg)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <button className="btn" style={{ padding: '0.24rem 0.45rem', fontSize: '0.75rem' }} onClick={() => onViewChange('settings')}>
                {t.settings}
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.theme}</span>
                <select
                  value={themeMode}
                  onChange={(e) => onThemeModeChange(e.target.value as ThemeMode)}
                  style={{ padding: '0.2rem 0.35rem', borderRadius: '7px', border: '1px solid var(--border-color)', fontSize: '0.78rem', background: 'var(--card-bg)', color: 'var(--text-color)' }}
                >
                  <option value="system">{t.theme_system}</option>
                  <option value="light">{t.theme_light}</option>
                  <option value="dark">{t.theme_dark}</option>
                </select>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.language}</span>
                <select
                  value={lang}
                  onChange={(e) => onLangChange(e.target.value as Lang)}
                  style={{ padding: '0.2rem 0.35rem', borderRadius: '7px', border: '1px solid var(--border-color)', fontSize: '0.78rem', background: 'var(--card-bg)', color: 'var(--text-color)' }}
                >
                  <option value="fr">{t.language_fr}</option>
                  <option value="en">{t.language_en}</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </header>
  );
}
