/**
 * Centralized API fetch utility
 * Automatically includes organization ID header for multi-tenant support
 */

// Get organization ID from localStorage (fallback)
const getOrganizationIdFromStorage = () => {
  return localStorage.getItem('currentOrgId') || null;
};

/**
 * Fetch wrapper that includes organization context
 * @param {string} url - API URL
 * @param {object} options - Fetch options (can include organizationId)
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  // PRIORITY: Use explicit organizationId > localStorage
  const organizationId = options.organizationId || getOrganizationIdFromStorage();
  
  // DEBUG: Log what's being sent
  console.log(`🔍 [API] ${options.method || 'GET'} ${url}`, {
    organizationId,
    source: options.organizationId ? 'EXPLICIT' : 'localStorage'
  });
  
  // Remove organizationId from options to not include it in body
  const { organizationId: _, ...fetchOptions } = options;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
    ...fetchOptions.headers,
  };
  
  return fetch(url, {
    ...fetchOptions,
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

