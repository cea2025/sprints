/**
 * Centralized API fetch utility
 * Automatically includes organization ID header for multi-tenant support
 */

// Get organization ID from localStorage
const getOrganizationId = () => {
  return localStorage.getItem('currentOrgId') || null;
};

/**
 * Fetch wrapper that includes organization context
 * @param {string} url - API URL
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  const organizationId = getOrganizationId();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
    ...options.headers,
  };
  
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
}

/**
 * Shorthand for GET requests
 */
export async function apiGet(url) {
  return apiFetch(url, { method: 'GET' });
}

/**
 * Shorthand for POST requests
 */
export async function apiPost(url, body) {
  return apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Shorthand for PUT requests
 */
export async function apiPut(url, body) {
  return apiFetch(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Shorthand for DELETE requests
 */
export async function apiDelete(url) {
  return apiFetch(url, { method: 'DELETE' });
}

export default apiFetch;

