import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Loads everything a dashboard needs ONCE when the user enters it, so every page opens instantly afterwards.
 * `getTasks(queryClient)` returns an array of promises (prefetchQuery calls and page chunk imports).
 * Returns `ready` when all of them settled (failures do not block) or after `timeoutMs`, whichever comes first.
 */
export function useDashboardPreload(getTasks, { timeoutMs = 8000 } = {}) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = () => { if (!cancelled) setReady(true); };
    const timer = setTimeout(finish, timeoutMs);
    Promise.allSettled(getTasks(queryClient)).then(() => {
      clearTimeout(timer);
      finish();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // getTasks is a module-level function; it must only run once per dashboard visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  return ready;
}
