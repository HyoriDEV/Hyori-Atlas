"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 30000;

/**
 * Garde la liste des tickets à jour (nouveaux messages, non-lus) tant que l'onglet est visible.
 */
export function TicketListRefresher() {
  const router = useRouter();

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return null;
}
