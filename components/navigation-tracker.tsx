"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEY = "hyori_session_nav_count";

/**
 * Returns true if the user has navigated at least once internally in this tab session,
 * or if document.referrer belongs to the same origin, meaning window.history.back()
 * will remain safely within the application.
 */
export function canGoBack(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const navCount = parseInt(sessionStorage.getItem(STORAGE_KEY) || "0", 10);
    if (navCount > 0) return true;

    if (document.referrer) {
      const refUrl = new URL(document.referrer);
      if (refUrl.origin === window.location.origin) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      const isInternalReferrer = (() => {
        try {
          return Boolean(
            document.referrer &&
              new URL(document.referrer).origin === window.location.origin
          );
        } catch {
          return false;
        }
      })();

      // Fresh tab or external referrer: start history depth at 0 if not already initialized
      if (!isInternalReferrer && sessionStorage.getItem(STORAGE_KEY) === null) {
        sessionStorage.setItem(STORAGE_KEY, "0");
      }
      return;
    }

    // Subsequent client-side navigations increment depth
    const current = parseInt(sessionStorage.getItem(STORAGE_KEY) || "0", 10);
    sessionStorage.setItem(STORAGE_KEY, String(Math.max(0, isNaN(current) ? 0 : current) + 1));
  }, [pathname, searchParams]);

  useEffect(() => {
    function handlePopState() {
      const current = parseInt(sessionStorage.getItem(STORAGE_KEY) || "0", 10);
      sessionStorage.setItem(STORAGE_KEY, String(Math.max(0, isNaN(current) ? 1 : current - 1)));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return null;
}
