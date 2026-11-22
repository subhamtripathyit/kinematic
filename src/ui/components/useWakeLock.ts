import { useEffect } from 'react';

/**
 * Keeps the phone screen on while `active` (workouts and routines): you're 2–3 m away
 * from the phone and not touching it, so it would otherwise dim and lock mid-set.
 * Browsers drop the lock when the tab is hidden, so it's asked for again on return.
 * Does nothing where the browser doesn't support it.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) void l.release();
        else lock = l;
      } catch {
        // not allowed right now (e.g. battery saver): the screen may still dim
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}
