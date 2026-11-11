const TOKEN_STORAGE_KEY = 'syncflow_auth_token';

/**
 * Security trade-off note:
 * The Express backend currently issues bearer JWTs in JSON login/register responses and
 * validates `Authorization: Bearer <token>` headers rather than HttpOnly cookies.
 * Storing the token in localStorage enables session persistence across page refreshes while
 * remaining vulnerable to XSS if untrusted scripts execute; therefore all rendered text
 * must avoid raw HTML injection and 401 responses immediately purge the stored token.
 */
export const getStoredToken = () => {
  try {
    return window.localStorage?.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (token) {
      window.localStorage?.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // Ignore storage write errors in restricted environments
  }
};

export const clearStoredToken = () => {
  try {
    window.localStorage?.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
};

export class ApiClientError extends Error {
  constructor(message, { status = 0, errors = [], fieldErrors = {}, isNetworkError = false } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;
    this.fieldErrors = fieldErrors;
    this.isNetworkError = isNetworkError;
  }
}

let unauthorizedHandler = null;

export const registerUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
};

export const getApiBaseUrl = () => {
  const configured = import.meta.env?.VITE_API_URL;
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/+$/, '');
  }
  return '/api';
};

const normalizeFieldErrors = (errorsArray) => {
  if (!Array.isArray(errorsArray)) return {};
  return errorsArray.reduce((acc, item) => {
    if (item && item.field && item.message && !acc[item.field]) {
      acc[item.field] = item.message;
    }
    return acc;
  }, {});
};

export async function apiRequest(
  path,
  { method = 'GET', body, headers = {}, skipAuth = false, timeoutMs = 15000 } = {}
) {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const isAbort = err && err.name === 'AbortError';
    throw new ApiClientError(
      isAbort
        ? 'Request timed out. Please check your connection and try again.'
        : 'Unable to reach the server. Check that the backend service is running.',
      { status: 0, isNetworkError: true }
    );
  }

  if (timeoutId) clearTimeout(timeoutId);

  let payload = null;
  const contentType = response.headers?.get?.('content-type') || '';
  if (
    (!contentType && typeof response.json === 'function') ||
    contentType.includes('application/json') ||
    contentType.includes('+json')
  ) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      clearStoredToken();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    const errors = Array.isArray(payload?.errors) ? payload.errors : [];
    const fieldErrors = normalizeFieldErrors(errors);
    const message =
      payload?.message || `Request failed with status ${response.status}`;

    throw new ApiClientError(message, {
      status: response.status,
      errors,
      fieldErrors,
    });
  }

  return payload;
}

export const apiClient = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
