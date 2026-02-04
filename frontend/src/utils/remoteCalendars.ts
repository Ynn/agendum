const RENNES_HOST = 'planning.univ-rennes1.fr';
const RENNES_PATH_PREFIX = '/jsp/custom/modules/plannings/';
const RENNES_PROXY_ENDPOINT = '/p/';
const DEV_PROXY_BASE_PATH = '/rennes-proxy';

const envProxyBase = (import.meta.env.VITE_RENNES_PROXY_BASE_URL as string | undefined)?.trim();

export const RENNES_PROXY_BASE_URL = envProxyBase || (import.meta.env.DEV ? DEV_PROXY_BASE_PATH : '');
export const AUTO_REFRESH_MS = 24 * 60 * 60 * 1000;
export const MANUAL_REFRESH_COOLDOWN_MS = 60 * 60 * 1000;

export function parseCalendarUrl(raw: string): URL {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('URL vide');
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL invalide');
    return parsed;
}

export function isRennesPlanningUrl(url: URL): boolean {
    return url.hostname === RENNES_HOST && url.pathname.startsWith(RENNES_PATH_PREFIX);
}

export function buildFetchUrlFromSource(sourceUrl: string): string {
    const parsed = parseCalendarUrl(sourceUrl);

    if (!isRennesPlanningUrl(parsed)) {
        return parsed.toString();
    }

    if (!RENNES_PROXY_BASE_URL) {
        throw new Error('Proxy non configuré (VITE_RENNES_PROXY_BASE_URL)');
    }

    let base: URL;
    try {
        base = new URL(RENNES_PROXY_BASE_URL);
    } catch {
        if (typeof window === 'undefined') {
            throw new Error('Proxy non configuré (VITE_RENNES_PROXY_BASE_URL)');
        }
        base = new URL(RENNES_PROXY_BASE_URL, window.location.origin);
    }
    const trimmedBasePath = base.pathname.replace(/\/+$/, '');
    const proxyBasePath = trimmedBasePath.endsWith('/p')
        ? trimmedBasePath
        : `${trimmedBasePath}${RENNES_PROXY_ENDPOINT.slice(0, -1)}`;
    const proxied = new URL(base.toString());
    proxied.pathname = `${proxyBasePath}/${parsed.pathname.replace(/^\//, '')}`.replace(/\/{2,}/g, '/');
    proxied.search = parsed.search;
    return proxied.toString();
}

export function calendarNameFromUrl(sourceUrl: string): string {
    const parsed = parseCalendarUrl(sourceUrl);
    const lastSegment = parsed.pathname.split('/').filter(Boolean).at(-1) || parsed.hostname;
    return decodeURIComponent(lastSegment).replace(/\.[^.]+$/, '');
}

export function msUntilManualRefreshAllowed(lastManualRefreshAt: number | null): number {
    if (!lastManualRefreshAt) return 0;
    const elapsed = Date.now() - lastManualRefreshAt;
    return Math.max(0, MANUAL_REFRESH_COOLDOWN_MS - elapsed);
}
