const { resolveAllowedOrigins } = require('../src/utils/corsOrigins');

describe('CORS Origin Resolver', () => {
  it('returns default localhost:3000 when empty or invalid', () => {
    expect(resolveAllowedOrigins('')).toBe('http://localhost:3000');
    expect(resolveAllowedOrigins(null)).toBe('http://localhost:3000');
    expect(resolveAllowedOrigins(undefined)).toBe('http://localhost:3000');
  });

  it('strips trailing slashes from single origin', () => {
    expect(resolveAllowedOrigins('https://flowdesk.vercel.app/')).toBe('https://flowdesk.vercel.app');
    expect(resolveAllowedOrigins('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('splits comma-separated origins and trims spaces and trailing slashes', () => {
    const input = 'https://flowdesk.app/, https://flowdesk.vercel.app, http://localhost:3000/ ';
    const origins = resolveAllowedOrigins(input);
    expect(origins).toEqual([
      'https://flowdesk.app',
      'https://flowdesk.vercel.app',
      'http://localhost:3000',
    ]);
  });
});
