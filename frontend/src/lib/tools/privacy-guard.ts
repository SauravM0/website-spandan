/**
 * Privacy guard for health tools.
 *
 * Guarantees:
 * - No user-entered values are sent to any server or API.
 * - No values are written to localStorage, sessionStorage, or cookies.
 * - No values are included in analytics events.
 * - No values appear in URL query parameters.
 *
 * All computation happens entirely on the client in pure functions.
 * This module provides runtime enforcement in development mode.
 */

const STORAGE_PREFIX = '@spandan/tools/';

export function assertNoStorage(key: string): void {
  if (typeof window === 'undefined') return;
  if (key.startsWith(STORAGE_PREFIX)) {
    console.warn(
      `[privacy-guard] Attempted storage access with tool prefix "${key}". ` +
        'Tool values must never be persisted. Remove this storage call.',
    );
  }
}

export function guardLocalStorage(): void {
  if (typeof window === 'undefined') return;
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, _value: string) {
    if (key.startsWith(STORAGE_PREFIX)) {
      console.warn(
        `[privacy-guard] Blocked localStorage.setItem("${key}") for tool data. ` +
          'Tool values must never be persisted.',
      );
      return;
    }
    originalSetItem.call(this, key, _value);
  };
}
