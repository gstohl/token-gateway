/**
 * Auth Proxy with Web Login (Node.js version for testing)
 * Authentication proxy with dark-themed login page and session management
 */

import http from 'http';
import { randomUUID } from 'crypto';

const VALID_PASSWORDS = process.env.VALID_PASSWORDS?.split(',').map(p => p.trim()) || [];
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3001;
const SESSION_COOKIE_NAME = 'auth_session';

// Simple session store (in production, use Redis or similar)
const sessions = new Map();

if (VALID_PASSWORDS.length === 0) {
  console.warn('⚠️  Warning: No valid passwords configured. Set VALID_PASSWORDS environment variable.');
}

console.log(`🔒 Auth Proxy starting with ${VALID_PASSWORDS.length} valid passwords`);
console.log(`🎯 Proxying to: ${TARGET_URL}`);

// Parse cookies from request
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...value] = cookie.trim().split('=');
      return [key, value.join('=')];
    })
  );
}

// Parse form data from POST request
async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      resolve(Object.fromEntries(params));
    });
    req.on('error', reject);
  });
}

// Check if request is from a browser (wants HTML)
function isBrowserRequest(req) {
  const accept = req.headers.accept || '';
  return accept.includes('text/html');
}

// Get the dark-themed login page HTML
function getLoginPage(error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Required</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e0e0e0;
        }

        .login-container {
            background: rgba(30, 30, 46, 0.95);
            padding: 3rem 2.5rem;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            width: 100%;
            max-width: 420px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .lock-icon {
            text-align: center;
            font-size: 4rem;
            margin-bottom: 1.5rem;
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        h1 {
            text-align: center;
            color: #ffffff;
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }

        .subtitle {
            text-align: center;
            color: #a0a0b0;
            margin-bottom: 2rem;
            font-size: 0.95rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #b0b0c0;
            font-size: 0.9rem;
            font-weight: 500;
        }

        input[type="password"] {
            width: 100%;
            padding: 0.9rem 1.2rem;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #ffffff;
            font-size: 1rem;
            transition: all 0.3s ease;
        }

        input[type="password"]:focus {
            outline: none;
            border-color: #6366f1;
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        button {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        button:active {
            transform: translateY(0);
        }

        .error-message {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .footer {
            text-align: center;
            margin-top: 2rem;
            color: #70707a;
            font-size: 0.85rem;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="lock-icon">🔒</div>
        <h1>Authentication Required</h1>
        <p class="subtitle">Enter your password to continue</p>

        ${error ? `<div class="error-message">
            <span>⚠️</span>
            <span>${error}</span>
        </div>` : ''}

        <form method="POST" action="/auth/login">
            <div class="form-group">
                <label for="password">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                    autofocus
                    autocomplete="current-password"
                >
            </div>

            <button type="submit">Unlock Access</button>
        </form>

        <div class="footer">
            🔐 Secure Authentication Gateway
        </div>
    </div>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const cookies = parseCookies(req.headers.cookie);

  // Health check endpoint
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  // Login page endpoint
  if (url.pathname === '/auth/login' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getLoginPage());
    return;
  }

  // Handle login form submission
  if (url.pathname === '/auth/login' && req.method === 'POST') {
    const formData = await parseFormData(req);
    const password = formData.password;

    if (password && VALID_PASSWORDS.includes(password)) {
      // Create session
      const sessionId = randomUUID();
      sessions.set(sessionId, {
        password,
        createdAt: Date.now()
      });

      // Redirect to home page with session cookie
      res.writeHead(302, {
        'Location': '/',
        'Set-Cookie': `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
      });
      res.end();
      return;
    } else {
      // Invalid password - show login page with error
      res.writeHead(401, { 'Content-Type': 'text/html' });
      res.end(getLoginPage('Invalid password. Please try again.'));
      return;
    }
  }

  // Logout endpoint
  if (url.pathname === '/auth/logout') {
    const sessionId = cookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.writeHead(302, {
      'Location': '/auth/login',
      'Set-Cookie': `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
    });
    res.end();
    return;
  }

  // Check authentication
  let isAuthenticated = false;
  let providedPassword = null;

  // 1. Check session cookie (for browser requests)
  const sessionId = cookies[SESSION_COOKIE_NAME];
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    providedPassword = session.password;
    isAuthenticated = true;
  }

  // 2. Check Authorization header (for API requests)
  if (!isAuthenticated) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      providedPassword = match ? match[1] : authHeader;
      if (providedPassword && VALID_PASSWORDS.includes(providedPassword)) {
        isAuthenticated = true;
      }
    }
  }

  // 3. Check query parameter (for testing)
  if (!isAuthenticated) {
    const queryPassword = url.searchParams.get('password');
    if (queryPassword && VALID_PASSWORDS.includes(queryPassword)) {
      providedPassword = queryPassword;
      isAuthenticated = true;
    }
  }

  // If not authenticated, return appropriate response
  if (!isAuthenticated) {
    // Browser request - show login page
    if (isBrowserRequest(req)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getLoginPage());
      return;
    }

    // API request - return JSON error
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="Auth Proxy"'
    });
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token',
      hint: 'Provide password via Authorization header (Bearer <password>) or visit /auth/login in a browser'
    }));
    return;
  }

  // Authenticated - proxy the request to backend
  try {
    const targetUrl = new URL(url.pathname + url.search, TARGET_URL);

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
  console.log(`🌐 Login page: http://localhost:${PORT}/auth/login`);
});
