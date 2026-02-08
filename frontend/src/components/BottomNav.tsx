import { type Lang, strings } from '../i18n';
import type { View } from '../state/uiState';
import { clsx } from 'clsx';
type I18nStrings = (typeof strings)[Lang];

interface Props {
  isMobile: boolean;
  lang: Lang;
  t: I18nStrings;
  view: View;
  onViewChange: (view: View) => void;
  onCloseMobileMenu: () => void;
}

interface NavBtnProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: string;
  compact?: boolean;
}

function NavBtn({ label, active, onClick, icon, compact = false }: NavBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`bottom-nav__btn ${active ? 'bottom-nav__btn--active' : ''}`}
      aria-label={label}
    >
      <span className={clsx('bottom-nav__icon', compact && 'bottom-nav__icon--compact')}>{icon}</span>
      <span className={clsx('bottom-nav__label', compact && 'bottom-nav__label--compact')}>{label}</span>
    </button>
  );
}

export function BottomNav({
  isMobile,
  lang,
  t,
  view,
  onViewChange,
  onCloseMobileMenu,
}: Props) {
  return (
    <div className={clsx('bottom-nav', !isMobile && 'bottom-nav--desktop')}>
      <NavBtn label={t.schedule} active={view === 'agenda'} onClick={() => onViewChange('agenda')} icon="📅" compact={isMobile} />
      <NavBtn label={t.courses} active={view === 'courses'} onClick={() => onViewChange('courses')} icon="📚" compact={isMobile} />
      <NavBtn label={t.service} active={view === 'stats'} onClick={() => onViewChange('stats')} icon="📊" compact={isMobile} />
      {isMobile && (
        <NavBtn
          label={lang === 'fr' ? 'Recherche' : 'Search'}
          active={view === 'search'}
          onClick={() => {
            onCloseMobileMenu();
            onViewChange('search');
          }}
          icon="🔎"
          compact={isMobile}
        />
      )}
      <NavBtn label={t.settings} active={view === 'settings'} onClick={() => onViewChange('settings')} icon="⚙️" compact={isMobile} />
    </div>
  );
}
