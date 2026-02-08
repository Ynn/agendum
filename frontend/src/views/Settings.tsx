import { useState } from 'react';
import { CalendarManager } from '../components/CalendarManager';
import { ImportZone } from '../components/ImportZone';
import { QrCodeModal } from '../components/QrCodeModal';
import { UiButton } from '../components/ui/UiButton';
import { UiSelect } from '../components/ui/UiSelect';
import type { Calendar, NormalizedEvent, ParseAndNormalizeDetailedResult } from '../types';
import { useLang, useT } from '../i18n';

interface Props {
    calendars: Calendar[];
    teacherOptions: { name: string; count: number }[];
    selectedTeacher: string;
    isMobile?: boolean;
    themeMode: 'system' | 'light' | 'dark';
    onSelectTeacher: (name: string) => void;
    onThemeModeChange: (mode: 'system' | 'light' | 'dark') => void;
    onPurgeAll: () => Promise<void>;
    onOpenFix: () => void;
    onImport: (name: string, events: NormalizedEvent[], isService: boolean) => void;
    parseIcsDetailed: (content: string) => Promise<ParseAndNormalizeDetailedResult>;
    onImportFromUrl: (url: string, name: string, isService: boolean) => Promise<void>;
    onRemove: (id: string) => void;
    onToggle: (id: string) => void;
    onToggleStats: (id: string) => void;
    onRefreshCalendar: (id: string) => Promise<void>;
    onRenameCalendar: (id: string, name: string) => void;
}

export function Settings({
    calendars,
    teacherOptions,
    selectedTeacher,
    isMobile = false,
    themeMode,
    onSelectTeacher,
    onThemeModeChange,
    onPurgeAll,
    onOpenFix,
    onImport,
    parseIcsDetailed,
    onImportFromUrl,
    onRemove,
    onToggle,
    onToggleStats,
    onRefreshCalendar,
    onRenameCalendar
}: Props) {
    const [showImport, setShowImport] = useState(false);
    const [qrValue, setQrValue] = useState<string | null>(null);
    const [importNotice, setImportNotice] = useState<string | null>(null);
    const t = useT();
    const lang = useLang();
    const repoUrl = 'https://github.com/Ynn/agendum';

    return (
        <div className={`settings-view fade-in page-scroll ${isMobile ? 'settings-view--mobile' : ''}`}>
            <h2 className={`settings-view__title ${isMobile ? 'settings-view__title--mobile' : ''}`}>{t.settings_title}</h2>

            {importNotice && (
                <div className={`card settings-alert settings-alert--warning ${isMobile ? 'settings-alert--mobile' : ''}`}>
                    <strong>{lang === 'fr' ? 'Avertissement' : 'Warning'}:</strong> {importNotice}
                </div>
            )}

            <section className={`card settings-section ${isMobile ? 'settings-section--mobile' : ''}`}>
                <h3 className={`settings-section__title ${isMobile ? 'settings-section__title--mobile' : ''}`}>{t.teacher_identity}</h3>
                <p className={`settings-section__desc ${isMobile ? 'settings-section__desc--mobile' : ''}`}>
                    {t.teacher_identity_desc}
                </p>
                <label className={`settings-section__label ${isMobile ? 'settings-section__label--mobile' : ''}`}>{t.teacher_select_label}</label>
                <UiSelect
                    value={selectedTeacher}
                    onChange={(e) => onSelectTeacher(e.target.value)}
                    uiSize={isMobile ? 'sm' : 'md'}
                    aria-label={t.teacher_select_label}
                >
                    <option value="">{t.teacher_select_none}</option>
                    {teacherOptions.map(opt => (
                        <option key={opt.name} value={opt.name}>
                            {opt.name} ({opt.count})
                        </option>
                    ))}
                </UiSelect>
            </section>

            {/* 2. Data Management */}
            <section className={`card settings-section ${isMobile ? 'settings-section--mobile' : ''}`}>
                <div className="settings-section__header">
                    <h3 className={`settings-section__title ${isMobile ? 'settings-section__title--mobile' : ''}`}>{t.data_sources}</h3>
                    <div className="settings-section__actions">
                        {!isMobile && (
                            <UiButton onClick={onOpenFix}>
                                {t.fix}
                            </UiButton>
                        )}
                        <UiButton onClick={() => setShowImport(true)} variant="primary" size={isMobile ? 'sm' : 'md'}>
                            {t.import_new_source}
                        </UiButton>
                    </div>
                </div>

                <p className={`settings-section__desc ${isMobile ? 'settings-section__desc--mobile' : ''}`}>
                    {t.data_sources_desc}
                </p>
                <p className={`settings-section__hint ${isMobile ? 'settings-section__hint--mobile' : ''}`}>
                    {t.data_sources_visible_hint}
                </p>

                <CalendarManager
                    calendars={calendars}
                    isMobile={isMobile}
                    onToggle={onToggle}
                    onToggleStats={onToggleStats}
                    onRemove={onRemove}
                    onRefresh={onRefreshCalendar}
                    onRename={onRenameCalendar}
                    onShowQr={setQrValue}
                />
            </section>

            <section className={`card settings-section settings-section--stacked ${isMobile ? 'settings-section--mobile' : ''}`}>
                <h3 className={`settings-section__title ${isMobile ? 'settings-section__title--mobile' : ''}`}>{t.data_and_privacy}</h3>
                <div className="settings-section__grid">
                    <div>
                        <label className={`settings-section__label ${isMobile ? 'settings-section__label--mobile' : ''}`}>{t.theme}</label>
                        <UiSelect
                            value={themeMode}
                            onChange={(e) => onThemeModeChange(e.target.value as 'system' | 'light' | 'dark')}
                            uiSize={isMobile ? 'sm' : 'md'}
                            aria-label={t.theme}
                        >
                            <option value="system">{t.theme_system}</option>
                            <option value="light">{t.theme_light}</option>
                            <option value="dark">{t.theme_dark}</option>
                        </UiSelect>
                    </div>
                    <div>
                        <p className={`settings-section__desc ${isMobile ? 'settings-section__desc--mobile' : ''}`}>
                            {t.purge_all_desc}
                        </p>
                        <UiButton
                            className="settings-danger-btn"
                            size={isMobile ? 'sm' : 'md'}
                            onClick={() => { void onPurgeAll(); }}
                        >
                            {t.purge_all}
                        </UiButton>
                    </div>
                </div>
            </section>

            <section className={`card settings-section settings-section--stacked ${isMobile ? 'settings-section--mobile' : ''}`}>
                <h3 className={`settings-section__title ${isMobile ? 'settings-section__title--mobile' : ''}`}>{t.about}</h3>
                <div className="settings-section__about">
                    <p className={`settings-section__about-line ${isMobile ? 'settings-section__about-line--mobile' : ''}`}>
                        {t.about_best_effort}
                    </p>
                    <p className={`settings-section__about-line ${isMobile ? 'settings-section__about-line--mobile' : ''}`}>
                        {t.about_not_official}
                    </p>
                    <p className={`settings-section__about-line ${isMobile ? 'settings-section__about-line--mobile' : ''}`}>
                        {t.about_verify}
                    </p>
                    <p className={`settings-section__about-line ${isMobile ? 'settings-section__about-line--mobile' : ''}`}>
                        {t.about_code_prefix}{' '}
                        <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                            {repoUrl}
                        </a>{' '}
                        {t.about_code_suffix}
                    </p>
                    <p className={`settings-section__about-line ${isMobile ? 'settings-section__about-line--mobile' : ''}`}>
                        {t.about_recovery}
                    </p>
                    <p className={`settings-section__about-line ${isMobile ? 'settings-section__about-line--mobile' : ''}`}>
                        {t.about_proxy}
                    </p>
                </div>
            </section>

            {showImport && (
                <div className="settings-import-overlay">
                    <ImportZone
                        isMobile={isMobile}
                        onImport={(n, e, s, warning) => {
                            onImport(n, e, s);
                            setImportNotice(warning || null);
                            setShowImport(false);
                        }}
                        parseIcsDetailed={parseIcsDetailed}
                        onImportFromUrl={async (url, name, isService) => {
                            await onImportFromUrl(url, name, isService);
                            setImportNotice(null);
                            setShowImport(false);
                        }}
                        onCancel={() => setShowImport(false)}
                    />
                </div>
            )}

            <QrCodeModal value={qrValue} onClose={() => setQrValue(null)} />
        </div>
    );
}
