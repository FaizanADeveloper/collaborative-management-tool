/**
 * Resolves allowed CORS origins from CLIENT_URL environment variable.
 * Supports single origin ("http://localhost:3000") or comma-delimited origins
 * ("https://flowdesk.vercel.app,http://localhost:3000") with trailing slashes stripped.
 *
 * @param {string} [clientUrl]
 * @returns {string|string[]}
 */
const resolveAllowedOrigins = (clientUrl) => {
  if (!clientUrl || typeof clientUrl !== 'string') {
    return 'http://localhost:3000';
  }

  if (clientUrl.includes(',')) {
    const list = clientUrl
      .split(',')
      .map((url) => url.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    return list.length > 0 ? list : 'http://localhost:3000';
  }

  return clientUrl.trim().replace(/\/+$/, '') || 'http://localhost:3000';
};

module.exports = { resolveAllowedOrigins };
