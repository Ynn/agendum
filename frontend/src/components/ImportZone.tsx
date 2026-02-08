import { useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { NormalizedEvent, ParseAndNormalizeDetailedResult } from '../types';
import { useLang, useT } from '../i18n';
import { QrScannerModal } from './QrScannerModal';
import { UiButton } from './ui/UiButton';
import { UiInput } from './ui/UiInput';
import { buildParserFatalMessage, buildParserWarningMessage } from '../utils/parseDiagnostics';

interface Props {
    isMobile?: boolean;
    onImport: (name: string, events: NormalizedEvent[], isService: boolean, warning?: string | null) => void;
    parseIcsDetailed: (content: string) => Promise<ParseAndNormalizeDetailedResult>;
    onImportFromUrl: (url: string, name: string, isService: boolean) => Promise<void>;
    onCancel: () => void;
}

export function ImportZone({
    isMobile = false,
    onImport,
    parseIcsDetailed,
    onImportFromUrl,
    onCancel
}: Props) {
    const [active, setActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [type, setType] = useState<'teacher' | 'resource'>('teacher');
    const [sourceMode, setSourceMode] = useState<'file' | 'url'>('file');
    const [calendarUrl, setCalendarUrl] = useState('');
    const [calendarName, setCalendarName] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const t = useT();
    const lang = useLang();

    const isIcsFile = (file: File) => file.name.toLowerCase().endsWith('.ics');

    const processFile = (file: File) => {
        if (!isIcsFile(file)) {
            setError(t.error_only_ics);
            return;
        }
        setLoading(true);
        setError(null);
        setWarning(null);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const parsed = await parseIcsDetailed(text);
                const events = Array.isArray(parsed?.events) ? parsed.events : [];
                const diagnostics = parsed?.diagnostics;
                const warningMessage = buildParserWarningMessage(diagnostics, lang);
                if (diagnostics?.parser_errors && events.length === 0) {
                    throw new Error(buildParserFatalMessage(diagnostics, lang, 'file'));
                }
                if (warningMessage) {
                    setWarning(warningMessage);
                }
                const name = calendarName.trim() || file.name.replace('.ics', '');
                onImport(name, events, type === 'teacher', warningMessage);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : t.error_parse);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const importFromUrl = async () => {
        if (!calendarUrl.trim()) {
            setError(t.error_parse);
            return;
        }
        try {
            new URL(calendarUrl.trim());
        } catch {
            setError(t.qr_invalid_url);
            return;
        }

        setLoading(true);
        setError(null);
        setWarning(null);
        try {
            const name = calendarName.trim();
            await onImportFromUrl(calendarUrl.trim(), name, type === 'teacher');
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : t.error_parse);
        } finally {
            setLoading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setActive(true);
    };

    const handleDragLeave = () => setActive(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className={`card import-zone ${isMobile ? 'import-zone--mobile' : ''}`}>
            {/* Error Banner */}
            {error && (
                <div className="import-zone__alert import-zone__alert--error">
                    <div>
                        <strong>{t.error_label}:</strong> {error}
                        <br />
                        <span className="import-zone__alert-meta">
                            {t.error_parse_desc}
                        </span>
                    </div>
                    <UiButton
                        variant="ghost"
                        size="sm"
                        className="import-zone__alert-close"
                        onClick={() => setError(null)}
                        aria-label={t.close}
                    >
                        ✕
                    </UiButton>
                </div>
            )}
            {warning && (
                <div className="import-zone__alert import-zone__alert--warning">
                    <strong>{lang === 'fr' ? 'Avertissement' : 'Warning'}:</strong> {warning}
                </div>
            )}

            <h3 className={`import-zone__title ${isMobile ? 'import-zone__title--mobile' : ''}`}>{t.import_calendar}</h3>

            <div className="import-zone__field">
                <label className={`import-zone__label ${isMobile ? 'import-zone__label--mobile' : ''}`}>
                    {t.calendar_name_label}
                </label>
                <UiInput
                    type="text"
                    value={calendarName}
                    onChange={(e) => setCalendarName(e.target.value)}
                    placeholder={t.calendar_name_placeholder}
                    disabled={loading}
                    uiSize={isMobile ? 'sm' : 'md'}
                />
            </div>

            {/* Type Selection */}
            <div className="import-zone__type-box">
                <div className="import-zone__type-title">{t.calendar_type}:</div>
                <div className="import-zone__type-options">
                    <label className="import-zone__type-option">
                        <input
                            type="radio"
                            name="calType"
                            checked={type === 'teacher'}
                            onChange={() => setType('teacher')}
                        />
                        <div>
                            <strong className="import-zone__type-label">{t.teacher_schedule}</strong>
                            <div className="import-zone__type-desc">{t.teacher_schedule_desc}</div>
                        </div>
                    </label>
                    <label className="import-zone__type-option">
                        <input
                            type="radio"
                            name="calType"
                            checked={type === 'resource'}
                            onChange={() => setType('resource')}
                        />
                        <div>
                            <strong className="import-zone__type-label">{t.resource_promo}</strong>
                            <div className="import-zone__type-desc">{t.resource_promo_desc}</div>
                        </div>
                    </label>
                </div>
            </div>

            <div className="import-zone__source-switch">
                <UiButton
                    className="import-zone__source-btn"
                    variant={sourceMode === 'file' ? 'primary' : 'default'}
                    size={isMobile ? 'sm' : 'md'}
                    onClick={() => setSourceMode('file')}
                    disabled={loading}
                >
                    {t.source_file}
                </UiButton>
                <UiButton
                    className="import-zone__source-btn"
                    variant={sourceMode === 'url' ? 'primary' : 'default'}
                    size={isMobile ? 'sm' : 'md'}
                    onClick={() => setSourceMode('url')}
                    disabled={loading}
                >
                    {t.source_url}
                </UiButton>
            </div>

            {sourceMode === 'file' && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={clsx(
                        'import-zone__drop-zone',
                        active && 'import-zone__drop-zone--active',
                        isMobile && 'import-zone__drop-zone--mobile',
                    )}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files && processFile(e.target.files[0])}
                        hidden
                        accept=".ics"
                    />
                    <p className="import-zone__drop-hint">
                        {loading ? t.parsing : t.drag_drop}
                    </p>
                </div>
            )}

            {sourceMode === 'url' && (
                <div className="import-zone__url-box">
                    <label className="import-zone__label">
                        {t.calendar_url_label}
                    </label>
                    <UiInput
                        type="url"
                        value={calendarUrl}
                        onChange={(e) => setCalendarUrl(e.target.value)}
                        placeholder={t.calendar_url_placeholder}
                        disabled={loading}
                        uiSize={isMobile ? 'sm' : 'md'}
                        className="import-zone__url-input"
                    />
                    <div className="import-zone__url-actions">
                        <UiButton
                            variant="primary"
                            size={isMobile ? 'sm' : 'md'}
                            onClick={() => { void importFromUrl(); }}
                            disabled={loading || !calendarUrl.trim()}
                        >
                            {loading ? t.parsing : t.import_url}
                        </UiButton>
                        <UiButton
                            size={isMobile ? 'sm' : 'md'}
                            onClick={() => setShowScanner(true)}
                            disabled={loading}
                        >
                            {t.scan_qr}
                        </UiButton>
                    </div>
                </div>
            )}

            <UiButton
                onClick={onCancel}
                variant="ghost"
                size={isMobile ? 'sm' : 'md'}
                className="import-zone__cancel"
            >
                {t.cancel}
            </UiButton>

            <QrScannerModal
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onDetected={(raw) => {
                    try {
                        const parsed = new URL(raw.trim());
                        setCalendarUrl(parsed.toString());
                        setSourceMode('url');
                        setError(null);
                        setShowScanner(false);
                    } catch {
                        setError(t.qr_invalid_url);
                        setShowScanner(false);
                    }
                }}
            />
        </div>
    );
}
