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

/** Reads #key= from the URL (saving it), falling back to localStorage. */
export function readEditKey(id: string): string | null {
  const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("key");
  if (fromHash) {
    saveEditKey(id, fromHash);
    return fromHash;
  }
  return storedEditKey(id);
}

export const reviewPath = (id: string, key: string) => `/g/${id}/review#key=${encodeURIComponent(key)}`;
