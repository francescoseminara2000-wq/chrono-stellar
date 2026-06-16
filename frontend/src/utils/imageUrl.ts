/**
 * Sanitizes an image URL by removing hardcoded legacy IP/port references
 * and ensuring paths are relative for the Vite proxy.
 */
export const sanitizeImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';

    // Remove hardcoded legacy URLs like http://192.168.178.139:3000/
    if (url.includes(':3000') || url.includes(':3001')) {
        return url.replace(/^https?:\/\/.*?:(3000|3001)/, '');
    }

    return url;
};
