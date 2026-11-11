import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

type State<T> = { data?: T; error?: string; loading: boolean };

/**
 * Loads data when the screen comes into focus (so it's fresh after coming back from an editor).
 * `load` must be stable: a module-level function or a useCallback.
 */
export function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ loading: true });

  const reload = useCallback(async () => {
    try {
      const data = await load();
      setState({ data, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, error: (e as Error).message, loading: false }));
    }
  }, [load]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  /** Use a response the screen already has (e.g. the release returned by an upload) without reloading. */
  const setData = useCallback((data: T) => setState({ data, loading: false }), []);

  return { ...state, reload, setData };
}
