// ============================================
// Notification
// ============================================

export interface NotifyOptions {
    title?: string;
    timeout?: number;
    onclick?: () => void;
}

/**
 * Show a notification (wrapper around GM_notification)
 */
export function notify(message: string, options: NotifyOptions = {}): void {
    GM_notification({
        text: message,
        title: options.title ?? 'StreamGrabber',
        timeout: options.timeout ?? 3000,
        onclick: options.onclick,
    });
}

/**
 * Notify download complete
 */
export function notifyDownloadComplete(filename: string): void {
    notify(`Download complete: ${filename}`);
}

// ============================================
// Error Handling
// ============================================

/**
 * Extract error message safely
 */
export function getErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return String(e);
}

/**
 * Show error alert with consistent formatting
 */
export function alertError(e: unknown, prefix?: string): void {
    const msg = getErrorMessage(e);
    alert(prefix ? `${prefix}: ${msg}` : msg);
}
