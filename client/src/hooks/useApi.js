import { useState, useCallback } from 'react';

/**
 * Custom hook for API calls with loading and error states
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((url) => request(url), [request]);

  const post = useCallback((url, body) => 
    request(url, { method: 'POST', body: JSON.stringify(body) }), [request]);

  const put = useCallback((url, body) => 
    request(url, { method: 'PUT', body: JSON.stringify(body) }), [request]);

  const patch = useCallback((url, body) => 
    request(url, { method: 'PATCH', body: JSON.stringify(body) }), [request]);

  const del = useCallback((url) => 
    request(url, { method: 'DELETE' }), [request]);

  return { loading, error, get, post, put, patch, del, request };
}

/**
 * Hook for fetching data on mount
 */
export function useFetch(url, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  // Initial fetch
  useState(() => {
    refetch();
  });

  return { data, loading, error, refetch };
}

export default useApi;

