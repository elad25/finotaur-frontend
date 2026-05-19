/**
 * webpush.ts — Browser Push subscription manager for Finotaur.
 *
 * Wraps the native PushManager API. No external push libraries.
 * VAPID public key is read from VITE_VAPID_PUBLIC_KEY at build time.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Converts a base64url-encoded VAPID public key to a Uint8Array
 * as required by PushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Pad to 4-char boundary
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getVapidPublicKey(): string | undefined {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the current push permission state, or 'unsupported' if the
 * browser does not support Web Push.
 */
export function getPushPermissionState(): PushPermissionState {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionState;
}

/**
 * Registers /sw.js as the service worker. Idempotent — returns the
 * existing registration if one is already active.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {
    console.error('webpush: service worker registration failed', err);
    return null;
  }
}

/**
 * Requests notification permission, subscribes via PushManager, and
 * POSTs the subscription to the backend.
 *
 * Returns { ok: true } on success, or { ok: false, reason } on failure.
 */
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    console.warn('webpush: VITE_VAPID_PUBLIC_KEY missing — push will not work');
    return { ok: false, reason: 'misconfigured' };
  }

  // 1. Request permission
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (err) {
    console.error('webpush: requestPermission threw', err);
    return { ok: false, reason: 'permission-error' };
  }

  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  // 2. Register SW and subscribe
  const registration = await registerServiceWorker();
  if (!registration) {
    return { ok: false, reason: 'sw-unavailable' };
  }

  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch (err) {
    console.error('webpush: pushManager.subscribe failed', err);
    return { ok: false, reason: 'subscribe-error' };
  }

  // 3. POST to backend
  try {
    const response = await fetch('/api/webpush/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!response.ok) {
      console.error('webpush: backend returned', response.status);
      return { ok: false, reason: 'backend-error' };
    }
  } catch (err) {
    console.error('webpush: fetch /api/webpush/subscribe failed', err);
    return { ok: false, reason: 'network-error' };
  }

  return { ok: true };
}

/**
 * Unsubscribes the current push subscription and notifies the backend.
 */
export async function unsubscribeFromPush(): Promise<{ ok: boolean }> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return { ok: true }; // Nothing to unsubscribe

  try {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await fetch('/api/webpush/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ endpoint }),
    });
  } catch (err) {
    console.error('webpush: unsubscribeFromPush failed', err);
    return { ok: false };
  }

  return { ok: true };
}

/**
 * Returns the active PushSubscription for this browser, or null if none.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.error('webpush: getCurrentSubscription failed', err);
    return null;
  }
}
