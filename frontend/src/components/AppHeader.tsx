import { type Lang, strings } from '../i18n';
import type { ThemeMode, View } from '../state/uiState';
import { UiButton } from './ui/UiButton';
import { UiInput } from './ui/UiInput';
import { UiSelect } from './ui/UiSelect';

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
    <header className={isMobile ? 'app-header app-header--mobile' : 'app-header'}>
      {!isMobile && (
        <>
          <div className="app-header__brand" onClick={() => onViewChange('agenda')}>
            {t.app_name.toUpperCase()}
          </div>

          <div className="app-header__search-row">
            <UiInput
              type="text"
              placeholder={`🔍 ${t.search_placeholder}`}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              uiSize="sm"
              aria-label={t.search_placeholder}
            />
            <UiButton
              onClick={onOpenFilters}
              variant={filtersActive ? 'primary' : 'default'}
              size="sm"
            >
              {t.filters}
            </UiButton>
          </div>

          <div className="app-header__controls">
            <span className="app-header__label">{t.theme}</span>
            <UiSelect
              value={themeMode}
              onChange={(e) => onThemeModeChange(e.target.value as ThemeMode)}
              uiSize="sm"
              aria-label={t.theme}
            >
              <option value="system">{t.theme_system}</option>
              <option value="light">{t.theme_light}</option>
              <option value="dark">{t.theme_dark}</option>
            </UiSelect>
            <span className="app-header__label">{t.language}</span>
            <UiSelect
              value={lang}
              onChange={(e) => onLangChange(e.target.value as Lang)}
              uiSize="sm"
              aria-label={t.language}
            >
              <option value="fr">{t.language_fr}</option>
              <option value="en">{t.language_en}</option>
            </UiSelect>
          </div>
        </>
      )}

      {isMobile && (
        <>
          <div className="app-header__brand" onClick={() => onViewChange('agenda')}>
            {t.app_name}
          </div>

          <div className="app-header__mobile-actions">
            <UiButton
              variant={mobileMenuOpen ? 'primary' : 'default'}
              size="sm"
              className="app-header__burger-btn"
              onClick={onToggleMobileMenu}
              aria-label={lang === 'fr' ? 'Menu principal' : 'Main menu'}
            >
              ☰
            </UiButton>
          </div>

          {view === 'search' && (
            <div className="app-header__search-row">
              <UiInput
                type="text"
                placeholder={`🔍 ${t.search_placeholder}`}
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                uiSize="sm"
                aria-label={t.search_placeholder}
              />
              <UiButton
                variant={filtersActive ? 'primary' : 'default'}
                size="sm"
                onClick={onOpenFilters}
              >
                {t.filters}
              </UiButton>
            </div>
          )}

          {mobileMenuOpen && (
            <div className="app-header__mobile-menu">
              <UiButton size="sm" className="app-header__mobile-menu-btn" onClick={() => onViewChange('settings')}>
                {t.settings}
              </UiButton>
              <div className="app-header__mobile-menu-controls">
                <span className="app-header__label">{t.theme}</span>
                <UiSelect
                  value={themeMode}
                  onChange={(e) => onThemeModeChange(e.target.value as ThemeMode)}
                  uiSize="sm"
                  aria-label={t.theme}
                >
                  <option value="system">{t.theme_system}</option>
                  <option value="light">{t.theme_light}</option>
                  <option value="dark">{t.theme_dark}</option>
                </UiSelect>
                <span className="app-header__label">{t.language}</span>
                <UiSelect
                  value={lang}
                  onChange={(e) => onLangChange(e.target.value as Lang)}
                  uiSize="sm"
                  aria-label={t.language}
                >
                  <option value="fr">{t.language_fr}</option>
                  <option value="en">{t.language_en}</option>
                </UiSelect>
              </div>
            </div>
          )}
        </>
      )}
    </header>
  );
}
