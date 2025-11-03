/**
 * Sample Backend Service (Node.js version for testing)
 * This is the "gated" webserver that sits behind the auth proxy
 */

import http from 'http';

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Set default headers
  res.setHeader('Content-Type', 'application/json');

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  // Root endpoint
  if (url.pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: '🎉 Welcome to the protected backend!',
      info: 'If you can see this, authentication was successful!',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/api/data',
        '/api/users',
        '/api/status'
      ]
    }));
    return;
  }

  // Sample API endpoints
  if (url.pathname === '/api/data') {
    res.writeHead(200);
    res.end(JSON.stringify({
      data: [
        { id: 1, name: 'Item 1', value: 100 },
        { id: 2, name: 'Item 2', value: 200 },
        { id: 3, name: 'Item 3', value: 300 }
      ],
      message: 'This is protected data'
    }));
    return;
  }

  if (url.pathname === '/api/users') {
    res.writeHead(200);
    res.end(JSON.stringify({
      users: [
        { id: 1, username: 'alice', role: 'admin' },
        { id: 2, username: 'bob', role: 'user' }
      ]
    }));
    return;
  }

  if (url.pathname === '/api/status') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'operational',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    }));
    return;
  }

  // 404 for unknown routes
  res.writeHead(404);
  res.end(JSON.stringify({
    error: 'Not Found',
    message: `Path ${url.pathname} not found`
  }));
});

server.listen(PORT, () => {
  console.log(`✅ Backend service listening on http://localhost:${PORT}`);
});
