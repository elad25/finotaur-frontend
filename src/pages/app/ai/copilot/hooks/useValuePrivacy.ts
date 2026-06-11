/**
 * useValuePrivacy — shared privacy toggle for COPILOT monetary values.
 *
 * State is persisted in localStorage (key: copilot_hide_values) so it
 * survives page reloads.  A custom window event ("copilot-privacy-change")
 * is dispatched on every toggle so all subscribed components update
 * immediately — no React context or prop-drilling required.
 */

import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'copilot_hide_values';
const EVENT_NAME = 'copilot-privacy-change';

function readStored(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Returns `[hideValues, toggleHideValues]`.
 * - `hideValues`: true when the user has hidden monetary amounts.
 * - `toggleHideValues`: call from the eye-icon click handler.
 */
export function useValuePrivacy(): [boolean, () => void] {
  const [hideValues, setHideValues] = useState<boolean>(readStored);

  // Listen for cross-component updates via the custom event.
  useEffect(() => {
    const handler = () => setHideValues(readStored());
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const toggleHideValues = useCallback(() => {
    const next = !readStored();
    try {
      localStorage.setItem(LS_KEY, String(next));
    } catch {
      // ignore — silently fails in restricted environments
    }
    // Notify all other subscribed components on the page.
    window.dispatchEvent(new Event(EVENT_NAME));
    // Also update local state immediately.
    setHideValues(next);
  }, []);

  return [hideValues, toggleHideValues];
}
