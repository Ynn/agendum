import { useEffect, useState } from 'react';
import type { Calendar } from '../types';
import { useLang, useT } from '../i18n';
import { msUntilManualRefreshAllowed } from '../utils/remoteCalendars';
import { UiButton } from './ui/UiButton';
import { UiInput } from './ui/UiInput';

interface Props {
    calendars: Calendar[];
    isMobile?: boolean;
    onToggle: (id: string) => void;
    onToggleStats: (id: string) => void;
    onRemove: (id: string) => void;
    onRefresh: (id: string) => Promise<void>;
    onRename: (id: string, name: string) => void;
    onShowQr: (url: string) => void;
}

export function CalendarManager({ calendars, isMobile = false, onToggle, onToggleStats, onRemove, onRefresh, onRename, onShowQr }: Props) {
    const t = useT();
    const lang = useLang();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const startRename = (cal: Calendar) => {
        setEditingId(cal.id);
        setDraftName(cal.name);
    };

    const submitRename = (id: string) => {
        const next = draftName.trim();
        if (next) onRename(id, next);
        setEditingId(null);
    };

    return (
        <div className={`card calendar-manager fade-in ${isMobile ? 'calendar-manager--mobile' : ''}`}>
            <div className="calendar-manager__header">
                <h3 className={`calendar-manager__title ${isMobile ? 'calendar-manager__title--mobile' : ''}`}>{t.calendars}</h3>
            </div>

            <div className={`calendar-manager__list ${isMobile ? 'calendar-manager__list--mobile' : ''}`}>
                {calendars.length === 0 && <p className="calendar-manager__empty">{t.no_calendars_imported}</p>}

                {calendars.map(cal => {
                    const refreshCooldownMs = msUntilManualRefreshAllowed(
                        cal.remote?.lastManualRefreshAt ?? null,
                        cal.remote?.manualRefreshHistory,
                        nowMs,
                    );
                    const refreshLabel = refreshCooldownMs > 0
                        ? t.refresh_wait.replace('{minutes}', `${Math.ceil(refreshCooldownMs / 60000)}`)
                        : t.refresh;

                    return (
                        <div key={cal.id} className={`calendar-manager__item ${isMobile ? 'calendar-manager__item--mobile' : ''}`}>
                            {/* Visibility Toggle */}
                            <button
                                type="button"
                                onClick={() => onToggle(cal.id)}
                                className="calendar-manager__visibility-toggle"
                                style={{
                                    background: cal.visible ? cal.color : 'transparent',
                                    border: `2px solid ${cal.color}`,
                                }}
                                aria-pressed={cal.visible}
                                aria-label={`${t.source_visible}: ${cal.name}`}
                                title={`${t.source_visible}: ${cal.name}`}
                            >
                                {/* Visual indicator handled by background, maybe add checkmark or dot if desired */}
                            </button>

                            <div className="calendar-manager__main">
                                {editingId === cal.id ? (
                                    <UiInput
                                        type="text"
                                        value={draftName}
                                        onChange={(e) => setDraftName(e.target.value)}
                                        onBlur={() => submitRename(cal.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') submitRename(cal.id);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        autoFocus
                                        uiSize="md"
                                        className="calendar-manager__rename-input"
                                    />
                                ) : (
                                    <div className={`calendar-manager__name ${isMobile ? 'calendar-manager__name--mobile' : ''}`}>{cal.name}</div>
                                )}

                                {cal.remote?.sourceUrl && (
                                    <div className={`calendar-manager__url ${isMobile ? 'calendar-manager__url--mobile' : ''}`}>
                                        {cal.remote.sourceUrl}
                                    </div>
                                )}
                                {cal.remote?.sourceUrl && (
                                    <div className={`calendar-manager__sync ${isMobile ? 'calendar-manager__sync--mobile' : ''}`}>
                                        {t.last_sync_prefix} {cal.remote.lastSyncedAt ? new Date(cal.remote.lastSyncedAt).toLocaleString() : t.last_sync_never}
                                        {cal.remote.lastError ? ` • ${t.sync_error}` : ''}
                                    </div>
                                )}
                                {cal.remote?.lastError && (
                                    <div className={`calendar-manager__error ${isMobile ? 'calendar-manager__error--mobile' : ''}`}>
                                        {t.sync_error}: {cal.remote.lastError}
                                    </div>
                                )}
                                {cal.remote?.lastWarning && (
                                    <div className={`calendar-manager__warning ${isMobile ? 'calendar-manager__warning--mobile' : ''}`}>
                                        {lang === 'fr' ? 'Avertissement' : 'Warning'}: {cal.remote.lastWarning}
                                    </div>
                                )}
                                {/* Stats Toggle */}
                                <label className={`calendar-manager__stats ${isMobile ? 'calendar-manager__stats--mobile' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={cal.includeInStats}
                                        onChange={() => onToggleStats(cal.id)}
                                    />
                                    {t.include_in_service}
                                </label>
                            </div>

                            <div className={`calendar-manager__actions ${isMobile ? 'calendar-manager__actions--mobile' : ''}`}>
                                {cal.remote?.sourceUrl && (
                                <UiButton
                                    onClick={() => { void onRefresh(cal.id); }}
                                    size="sm"
                                    className={`calendar-manager__action-btn ${isMobile ? 'calendar-manager__action-btn--compact' : ''}`}
                                    disabled={refreshCooldownMs > 0}
                                    title={refreshLabel}
                                    aria-label={refreshLabel}
                                >
                                    {refreshLabel}
                                </UiButton>
                                )}

                                {cal.remote?.sourceUrl && (
                                    <UiButton
                                        onClick={() => onShowQr(cal.remote!.sourceUrl)}
                                        size="sm"
                                        className={`calendar-manager__action-btn ${isMobile ? 'calendar-manager__action-btn--compact' : ''}`}
                                        title={t.show_qr}
                                        aria-label={t.show_qr}
                                    >
                                        QR
                                    </UiButton>
                                )}

                                <UiButton
                                    onClick={() => startRename(cal)}
                                    size="sm"
                                    className={`calendar-manager__action-btn ${isMobile ? 'calendar-manager__action-btn--compact' : ''}`}
                                    title={t.rename}
                                    aria-label={t.rename}
                                >
                                    {t.rename}
                                </UiButton>

                                <UiButton
                                    onClick={() => onRemove(cal.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="calendar-manager__remove-btn"
                                    title={lang === 'fr' ? 'Supprimer le calendrier' : 'Remove calendar'}
                                    aria-label={lang === 'fr' ? 'Supprimer le calendrier' : 'Remove calendar'}
                                >
                                    &times;
                                </UiButton>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
