import { useEffect, useState } from "react";

/**
 * Runs an async fetch function once on mount and tracks its state.
 *
 * @param {() => Promise<any>} fetchFn  A STABLE function reference (e.g. one
 *   imported from the api service). Don't pass an inline arrow function or it
 *   will refetch on every render.
 * @param {any} initialData  Value for `data` before the request resolves.
 * @returns {{ data, loading, error }}
 */
const useFetch = (fetchFn, initialData = []) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchFn();
        if (!isMounted) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Something went wrong");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchFn]);

  return { data, loading, error };
};

export default useFetch;
