/**
 * Generate deterministic, readable colors for subject names.
 * - Stable base color per subject (larger palette for better spread)
 * - Optional slight type variation for CM/TD/TP readability in calendars
 */

const COLOR_PALETTE = [
    '#EF4444',
    '#F97316',
    '#F59E0B',
    '#EAB308',
    '#84CC16',
    '#65A30D',
    '#22C55E',
    '#16A34A',
    '#10B981',
    '#059669',
    '#14B8A6',
    '#0F766E',
    '#06B6D4',
    '#0891B2',
    '#0EA5E9',
    '#0284C7',
    '#3B82F6',
    '#2563EB',
    '#1D4ED8',
    '#4F46E5',
    '#6366F1',
    '#7C3AED',
    '#8B5CF6',
    '#A855F7',
    '#9333EA',
    '#C026D3',
    '#D946EF',
    '#EC4899',
    '#DB2777',
    '#F43F5E',
    '#E11D48',
    '#FB7185',
    '#DC2626',
    '#EA580C',
    '#CA8A04',
    '#BE123C',
    '#9D174D',
    '#BE185D',
    '#7C2D12',
    '#7F1D1D',
];

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const clean = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    };
};

const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (value: number) => clampByte(value).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const mixHex = (hex: string, target: { r: number; g: number; b: number }, ratio: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const t = Math.max(0, Math.min(1, ratio));
    const r = rgb.r + (target.r - rgb.r) * t;
    const g = rgb.g + (target.g - rgb.g) * t;
    const b = rgb.b + (target.b - rgb.b) * t;
    return rgbToHex(r, g, b);
};

const darkenHex = (hex: string, ratio: number) => mixHex(hex, { r: 0, g: 0, b: 0 }, ratio);
const lightenHex = (hex: string, ratio: number) => mixHex(hex, { r: 255, g: 255, b: 255 }, ratio);

const getReadableTextColor = (bgHex: string): '#000000' | '#FFFFFF' => {
    const rgb = hexToRgb(bgHex);
    if (!rgb) return '#FFFFFF';
    // YIQ luma approximation for quick readable foreground choice
    const yiq = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
    return yiq >= 150 ? '#000000' : '#FFFFFF';
};

/**
 * Simple hash function for strings
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Get a deterministic color for a subject
 * @param subject - The subject name
 * @returns An object with background and text colors
 */
export function getSubjectColor(subject: string): { bg: string; text: string } {
    if (!subject || subject.trim() === '') {
        return { bg: '#94A3B8', text: '#FFFFFF' }; // Default gray
    }

    const hash = hashString(subject.trim().toLowerCase());
    const index = hash % COLOR_PALETTE.length;
    const bg = COLOR_PALETTE[index];
    return { bg, text: getReadableTextColor(bg) };
}

/**
 * Get a lighter version of the subject color for backgrounds
 */
export function getSubjectColorLight(subject: string): string {
    const color = getSubjectColor(subject);
    // Convert hex to RGB and add opacity
    const hex = color.bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
}

/**
 * Slightly adjust a base subject color by course type:
 * - CM: darker
 * - TD: base
 * - TP: lighter
 */
export function getTypeAdjustedColor(baseBg: string, rawType: string): { bg: string; text: string } {
    const upper = (rawType || '').toUpperCase();
    let bg = baseBg;

    if (upper.includes('CM')) {
        bg = darkenHex(baseBg, 0.14);
    } else if (upper.includes('TP')) {
        bg = lightenHex(baseBg, 0.14);
    }

    return { bg, text: getReadableTextColor(bg) };
}
