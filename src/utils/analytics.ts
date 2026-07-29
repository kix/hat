/**
 * Safe wrapper for sending Google Analytics events.
 * Fail-safe in case of ad-blockers or disabled tracking.
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  try {
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', eventName, params);
    }
  } catch (err) {
    // Fail silently so ad-blockers never disrupt the application flow
    console.warn('Analytics event tracking blocked or failed:', err);
  }
}
