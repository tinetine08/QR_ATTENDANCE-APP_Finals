import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getQueue } from './offlineQueue';
import { syncQueue } from './smartAttendance';

// Retries pending offline scans on mount, every 15s, and whenever the app returns to the foreground.
export function useOfflineSync() {
  const [pending, setPending] = useState(0);

  const refresh = useCallback(async () => setPending((await getQueue()).length), []);
  const syncNow = useCallback(async () => {
    await syncQueue();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    syncNow();
    const timer = setInterval(syncNow, 15000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && syncNow());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [syncNow]);

  return { pending, syncNow, refresh };
}