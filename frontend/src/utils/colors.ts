/**
 * Generate a deterministic color for a subject name
 * Uses a simple hash function to ensure the same subject always gets the same color
 */

// Curated palette of colors with good contrast for text readability
const COLOR_PALETTE = [
    { bg: '#EF4444', text: '#FFFFFF' }, // Red
    { bg: '#F97316', text: '#FFFFFF' }, // Orange
    { bg: '#F59E0B', text: '#000000' }, // Amber
    { bg: '#84CC16', text: '#000000' }, // Lime
    { bg: '#10B981', text: '#FFFFFF' }, // Emerald
    { bg: '#14B8A6', text: '#FFFFFF' }, // Teal
    { bg: '#06B6D4', text: '#000000' }, // Cyan
    { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
    { bg: '#6366F1', text: '#FFFFFF' }, // Indigo
    { bg: '#8B5CF6', text: '#FFFFFF' }, // Violet
    { bg: '#A855F7', text: '#FFFFFF' }, // Purple
    { bg: '#D946EF', text: '#FFFFFF' }, // Fuchsia
    { bg: '#EC4899', text: '#FFFFFF' }, // Pink
    { bg: '#F43F5E', text: '#FFFFFF' }, // Rose
    { bg: '#0EA5E9', text: '#FFFFFF' }, // Sky
    { bg: '#22C55E', text: '#000000' }, // Green
    { bg: '#EAB308', text: '#000000' }, // Yellow
    { bg: '#DC2626', text: '#FFFFFF' }, // Red-700
    { bg: '#7C3AED', text: '#FFFFFF' }, // Violet-600
    { bg: '#059669', text: '#FFFFFF' }, // Emerald-600
];

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
    return COLOR_PALETTE[index];
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
