import type { Lang } from '../i18n';
import type { ParseDiagnostics } from '../types';

export function buildParserWarningMessage(
  diagnostics: ParseDiagnostics | undefined,
  lang: Lang,
): string | null {
  if (!diagnostics?.parser_errors) return null;
  const errors = diagnostics.parser_errors;
  const skipped = diagnostics.skipped_events_without_uid;
  if (lang === 'fr') {
    return `Import terminé avec avertissements: ${errors} erreur(s) de parsing, ${skipped} événement(s) ignoré(s) sans UID.`;
  }
  return `Import finished with warnings: ${errors} parsing error(s), ${skipped} event(s) skipped without UID.`;
}

export function buildParserFatalMessage(
  diagnostics: ParseDiagnostics | undefined,
  lang: Lang,
  context: 'file' | 'calendar',
): string {
  const errors = diagnostics?.parser_errors ?? 0;
  const sample = diagnostics?.parser_error_messages?.[0];
  const detail = sample ? ` ${sample}` : '';
  if (lang === 'fr') {
    if (context === 'file') {
      return `Le fichier ICS est invalide (${errors} erreur(s)).${detail}`;
    }
    return `Le calendrier ICS est invalide (${errors} erreur(s)).${detail}`;
  }
  if (context === 'file') {
    return `Invalid ICS file (${errors} error(s)).${detail}`;
  }
  return `Invalid ICS calendar (${errors} error(s)).${detail}`;
}
