import { type Lang, strings } from '../i18n';
import type { View } from '../state/uiState';
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
      style={{
        background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '4px', cursor: 'pointer',
        color: active ? 'var(--primary-color)' : 'var(--text-light)',
        fontWeight: active ? 600 : 400
      }}
    >
      <span style={{ fontSize: compact ? '1.02rem' : '1.2rem' }}>{icon}</span>
      <span style={{ fontSize: compact ? '0.62rem' : '0.75rem' }}>{label}</span>
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
    <div style={{
      position: 'fixed', bottom: 0, left: 0, width: '100%',
      background: 'var(--card-bg)', borderTop: '1px solid var(--border-color)',
      display: 'flex', justifyContent: 'space-around', padding: isMobile ? '0.45rem 0' : '0.8rem 0',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 100
    }}>
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
