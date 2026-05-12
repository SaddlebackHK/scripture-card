import { useCallback, useEffect, useRef, useState } from 'react';
import { dispatchUseCase } from '@presentation/utils';
import { useContainer } from './useContainer';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const VISIBILITY_RECHECK_THROTTLE_MS = 5 * 60 * 1000;

export interface UpdateAvailableState {
  readonly hasUpdate: boolean;
  readonly dismiss: () => void;
}

// Detects when a newer build of the app has been deployed while this tab is
// open. The check is cheap (one HTTP fetch of /version.json) and runs on a
// daily cadence, with an extra check whenever the tab regains focus —
// throttled so a user toggling tabs doesn't trigger a request every time.
//
// Once an update is detected the hook stops polling and reports `hasUpdate`
// until the user dismisses or reloads. Network failures are silently ignored
// (covers offline + dev mode where /version.json doesn't exist).
export const useUpdateAvailable = (): UpdateAvailableState => {
  const container = useContainer();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastCheckedRef = useRef(0);

  useEffect(() => {
    if (hasUpdate) return;

    let cancelled = false;

    const runCheck = () => {
      lastCheckedRef.current = Date.now();
      // Failures are silently ignored — usually offline or dev mode (no version.json).
      dispatchUseCase(container.useCases.checkForUpdate.execute(), (r) => {
        if (cancelled) return;
        if (r.ok && r.value) setHasUpdate(true);
      });
    };

    runCheck();
    const intervalId = window.setInterval(runCheck, ONE_DAY_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheckedRef.current < VISIBILITY_RECHECK_THROTTLE_MS) return;
      runCheck();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [container, hasUpdate]);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return { hasUpdate: hasUpdate && !dismissed, dismiss };
};
