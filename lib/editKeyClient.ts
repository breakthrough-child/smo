// The helper's edit key lives in the review URL's #fragment and in localStorage
// (spec.md > Review). Storage can throw (private mode), so every access is guarded.
const storageKey = (id: string) => `smo:key:${id}`;

export function saveEditKey(id: string, key: string): void {
  try {
    localStorage.setItem(storageKey(id), key);
  } catch {}
}

export function forgetEditKey(id: string): void {
  try {
    localStorage.removeItem(storageKey(id));
  } catch {}
}

export function storedEditKey(id: string): string | null {
  try {
    return localStorage.getItem(storageKey(id));
  } catch {
    return null;
  }
}

export function hashEditKey(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get("key");
}

/** Keys worth trying, link first. Save one only after the server accepts it, so a bad link can't overwrite a good key. */
export function candidateEditKeys(id: string): string[] {
  return [...new Set([hashEditKey(), storedEditKey(id)].filter((k): k is string => !!k))];
}

/** The key this browser will use for edits (the saved one, else the link's). */
export function readEditKey(id: string): string | null {
  return storedEditKey(id) ?? hashEditKey();
}

export const reviewPath = (id: string, key: string) => `/g/${id}/review#key=${encodeURIComponent(key)}`;
