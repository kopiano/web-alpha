import { useEffect, type EffectCallback, type DependencyList } from "react";

/**
 * Like useEffect, but defers execution until the browser is idle
 * or after a configurable delay (default 2s after mount).
 * Use this for non-critical data fetching (weather, music, hot search, etc.)
 */
export function useDeferredEffect(
  fn: EffectCallback,
  deps?: DependencyList,
  delay = 2000,
) {
  useEffect(() => {
    const id = setTimeout(() => {
      const cleanup = fn();
      if (cleanup) {
        // Store cleanup for immediate execution
        return cleanup;
      }
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
