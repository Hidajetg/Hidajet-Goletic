"use client";

import { useEffect } from "react";

/** The signed Android shell sends this cancellable event before navigating.
 * A visible local panel can consume Back without leaving its current page. */
export function useNativeBack(handler: () => boolean) {
  useEffect(() => {
    const onBack = (event: Event) => {
      if (!event.defaultPrevented && handler()) event.preventDefault();
    };
    window.addEventListener("solstone-native-back", onBack);
    return () => window.removeEventListener("solstone-native-back", onBack);
  }, [handler]);
}
