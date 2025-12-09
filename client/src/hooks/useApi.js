import { useState, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';

// Get organization ID from localStorage (works outside of React context)
const getOrganizationId = () => {
  return localStorage.getItem('currentOrgId') || null;
};

/**
 * Custom hook for API calls with loading, error states and toast notifications
 * Automatically includes X-Organization-Id header for multi-tenant support
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const request = useCallback(async (url, options = {}) => {
    const { 
      method = 'GET', 
      body, 
      showToast = true,
      successMessage,
      headers = {}
    } = options;

    setLoading(true);
    setError(null);

    try {
      // Get current organization ID
      const organizationId = getOrganizationId();
      
      const fetchOptions = {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          // Add organization ID header for multi-tenant API calls
          ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
          ...headers,
        },
      };

      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      // Handle 401 - unauthorized
      if (response.status === 401) {
        if (showToast) toast.error('לא מורשה - יש להתחבר מחדש');
        return null;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || `שגיאה ${response.status}`;
        if (showToast) toast.error(errorMsg);
        setError(errorMsg);
        return null;
      }

      if (successMessage && showToast) {
        toast.success(successMessage);
      }

      return data;
    } catch (err) {
      const errorMsg = err.message || 'שגיאה בחיבור לשרת';
      if (showToast) toast.error(errorMsg);
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { loading, error, request };
}

export default useApi;
