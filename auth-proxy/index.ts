/**
 * Bun Auth Proxy
 * A simple authentication proxy that validates passwords from an environment variable
 */

const VALID_PASSWORDS = process.env.VALID_PASSWORDS?.split(',').map(p => p.trim()) || [];
const TARGET_URL = process.env.TARGET_URL || 'http://backend:3000';
const PORT = process.env.PORT || 3001;

if (VALID_PASSWORDS.length === 0) {
  console.warn('⚠️  Warning: No valid passwords configured. Set VALID_PASSWORDS environment variable.');
}

console.log(`🔒 Auth Proxy starting with ${VALID_PASSWORDS.length} valid passwords`);
console.log(`🎯 Proxying to: ${TARGET_URL}`);

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Extract password from Authorization header (Bearer token)
    const authHeader = req.headers.get('Authorization');
    let providedPassword: string | null = null;

    if (authHeader) {
      // Support both "Bearer token" and "token" formats
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      providedPassword = match ? match[1] : authHeader;
    }

    // Also check for password in query parameter (for testing)
    const queryPassword = url.searchParams.get('password');
    if (queryPassword) {
      providedPassword = queryPassword;
    }

    // Validate password
    if (!providedPassword || !VALID_PASSWORDS.includes(providedPassword)) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token',
          hint: 'Provide password via Authorization header (Bearer <password>) or ?password= query parameter'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="Auth Proxy"'
          }
        }
      );
    }

    // Password is valid, proxy the request
    try {
      const targetUrl = new URL(url.pathname + url.search, TARGET_URL);

      // Forward the request to the backend
      const proxyReq = new Request(targetUrl.toString(), {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });

      const response = await fetch(proxyReq);

      // Return the backend response
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.error('❌ Proxy error:', error);
      return new Response(
        JSON.stringify({
          error: 'Bad Gateway',
          message: 'Failed to connect to backend service'
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  },
});

console.log(`✅ Auth Proxy listening on http://localhost:${PORT}`);
