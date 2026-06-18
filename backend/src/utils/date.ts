/**
 * Helpers for handling Date and Timezone operations in Europe/Rome
 */

/**
 * Formats a Date object to YYYY-MM-DD in Europe/Rome timezone.
 */
export function formatDateInRome(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    return `${year}-${month}-${day}`;
}

/**
 * Gets the hour of a Date object (0-23) in Europe/Rome timezone.
 */
export function getHourInRome(date: Date): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Rome',
        hour: 'numeric',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    return parseInt(parts.find(p => p.type === 'hour')!.value, 10);
}

/**
 * Gets the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * of a Date object in Europe/Rome timezone.
 */
export function getDayOfWeekInRome(date: Date): number {
    const partsFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const parts = partsFormatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')!.value, 10);
    const month = parseInt(parts.find(p => p.type === 'month')!.value, 10) - 1; // 0-indexed month
    const day = parseInt(parts.find(p => p.type === 'day')!.value, 10);
    
    const localDate = new Date(year, month, day);
    return localDate.getDay();
}

/**
 * Adds days to a Date object.
 */
export function addDaysInRome(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
