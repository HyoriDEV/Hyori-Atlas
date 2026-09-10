export const TABLE_PREFS_COOKIE = "hyori_table_prefs";

export type PagePreferences = Record<string, string>;
export type AllPreferences = Record<string, PagePreferences>;

/**
 * Parses raw JSON / URI-encoded preferences string safely.
 */
export function parsePreferences(raw: string | undefined | null): AllPreferences {
  if (!raw) return {};
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    } catch {
      // ignore parse errors
    }
  }
  return {};
}

/**
 * Reads stored preferences for a given pathname on the server from cookies.
 */
export function getServerPagePrefs(
  cookieStore: { get(name: string): { value: string } | undefined },
  pathname: string
): PagePreferences {
  const cookie = cookieStore.get(TABLE_PREFS_COOKIE);
  const all = parsePreferences(cookie?.value);
  return all[pathname] ?? {};
}

/**
 * Reads stored preferences for a given pathname on the client.
 */
export function getClientPagePrefs(pathname: string): PagePreferences {
  if (typeof window === "undefined") return {};
  try {
    // 1. Try document.cookie
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${TABLE_PREFS_COOKIE}=`));
    if (match) {
      const value = match.split("=").slice(1).join("=");
      const all = parsePreferences(value);
      if (all[pathname]) return all[pathname];
    }
    // 2. Fallback to localStorage
    const local = localStorage.getItem(TABLE_PREFS_COOKIE);
    if (local) {
      const all = parsePreferences(local);
      return all[pathname] ?? {};
    }
  } catch {
    // ignore
  }
  return {};
}

/**
 * Saves or updates preferences for a pathname on the client (both cookie & localStorage).
 * Automatically strips empty values, undefined, null or "ALL".
 */
export function setClientPagePref(
  pathname: string,
  newPrefs: Record<string, string | undefined | null>
) {
  if (typeof window === "undefined") return;
  try {
    let all: AllPreferences = {};
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${TABLE_PREFS_COOKIE}=`));
    if (match) {
      const value = match.split("=").slice(1).join("=");
      all = parsePreferences(value);
    } else {
      const local = localStorage.getItem(TABLE_PREFS_COOKIE);
      if (local) all = parsePreferences(local);
    }

    const current = { ...(all[pathname] ?? {}) };

    for (const [key, val] of Object.entries(newPrefs)) {
      if (val === undefined || val === null || val === "" || val === "ALL") {
        delete current[key];
      } else {
        current[key] = val;
      }
    }

    if (Object.keys(current).length === 0) {
      delete all[pathname];
    } else {
      all[pathname] = current;
    }

    const serialized = JSON.stringify(all);
    const encoded = encodeURIComponent(serialized);

    // Save cookie with 1 year expiration
    document.cookie = `${TABLE_PREFS_COOKIE}=${encoded}; path=/; max-age=31536000; SameSite=Lax`;
    // Save localStorage as mirror
    localStorage.setItem(TABLE_PREFS_COOKIE, serialized);
  } catch {
    // ignore
  }
}

/**
 * Clears all saved preferences for a specific pathname.
 */
export function clearClientPagePref(pathname: string) {
  if (typeof window === "undefined") return;
  try {
    let all: AllPreferences = {};
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${TABLE_PREFS_COOKIE}=`));
    if (match) {
      const value = match.split("=").slice(1).join("=");
      all = parsePreferences(value);
    } else {
      const local = localStorage.getItem(TABLE_PREFS_COOKIE);
      if (local) all = parsePreferences(local);
    }

    delete all[pathname];

    const serialized = JSON.stringify(all);
    const encoded = encodeURIComponent(serialized);
    document.cookie = `${TABLE_PREFS_COOKIE}=${encoded}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem(TABLE_PREFS_COOKIE, serialized);
  } catch {
    // ignore
  }
}

/**
 * Checks if a redirect is needed on server-side when searchParams is empty
 * and the user has saved preferences for this pathname.
 * Returns the target redirect URL or null if no redirect is needed.
 */
export function checkRedirectWithSavedPrefs(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
  savedPrefs: PagePreferences
): string | null {
  // If searchParams already has any keys (e.g. query, explicit tab, pagination),
  // we do not redirect.
  const paramKeys = Object.keys(searchParams).filter(
    (k) => searchParams[k] !== undefined && searchParams[k] !== ""
  );
  if (paramKeys.length > 0) {
    return null;
  }

  // If there are no saved preferences, no redirect needed.
  if (!savedPrefs || Object.keys(savedPrefs).length === 0) {
    return null;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(savedPrefs)) {
    if (value && value !== "ALL") {
      params.set(key, value);
    }
  }

  const qs = params.toString();
  if (!qs) return null;
  return `${pathname}?${qs}`;
}
