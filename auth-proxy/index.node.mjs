/**
 * Bun Auth Proxy (Node.js version for testing)
 * A simple authentication proxy that validates passwords from an environment variable
 */

import http from 'http';

const VALID_PASSWORDS = process.env.VALID_PASSWORDS?.split(',').map(p => p.trim()) || [];
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3001;

if (VALID_PASSWORDS.length === 0) {
  console.warn('⚠️  Warning: No valid passwords configured. Set VALID_PASSWORDS environment variable.');
}

console.log(`🔒 Auth Proxy starting with ${VALID_PASSWORDS.length} valid passwords`);
console.log(`🎯 Proxying to: ${TARGET_URL}`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Health check endpoint
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  // Extract password from Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  let providedPassword = null;

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
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="Auth Proxy"'
    });
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token',
      hint: 'Provide password via Authorization header (Bearer <password>) or ?password= query parameter'
    }));
    return;
  }

  // Password is valid, proxy the request
  try {
    const targetUrl = new URL(url.pathname + url.search, TARGET_URL);

    // Forward the request to the backend
    const proxyReq = http.request(targetUrl, {
      method: req.method,
      headers: req.headers,
    }, (proxyRes) => {
      // Forward response headers
      res.writeHead(proxyRes.statusCode, proxyRes.headers);

      // Pipe response body
      proxyRes.pipe(res);
    });

    // Handle proxy errors
    proxyReq.on('error', (error) => {
      console.error('❌ Proxy error:', error);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Gateway',
        message: 'Failed to connect to backend service'
      }));
    });

    // Pipe request body
    req.pipe(proxyReq);
  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Bad Gateway',
      message: 'Failed to connect to backend service'
    }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ Auth Proxy listening on http://localhost:${PORT}`);
});
