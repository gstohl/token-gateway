/**
 * Sample Backend Service
 * This is the "gated" webserver that sits behind the auth proxy
 */

const PORT = process.env.PORT || 3000;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Root endpoint
    if (url.pathname === '/') {
      return new Response(
        JSON.stringify({
          message: '🎉 Welcome to the protected backend!',
          info: 'If you can see this, authentication was successful!',
          timestamp: new Date().toISOString(),
          endpoints: [
            '/api/data',
            '/api/users',
            '/api/status'
          ]
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Sample API endpoints
    if (url.pathname === '/api/data') {
      return new Response(
        JSON.stringify({
          data: [
            { id: 1, name: 'Item 1', value: 100 },
            { id: 2, name: 'Item 2', value: 200 },
            { id: 3, name: 'Item 3', value: 300 }
          ],
          message: 'This is protected data'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (url.pathname === '/api/users') {
      return new Response(
        JSON.stringify({
          users: [
            { id: 1, username: 'alice', role: 'admin' },
            { id: 2, username: 'bob', role: 'user' }
          ]
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (url.pathname === '/api/status') {
      return new Response(
        JSON.stringify({
          status: 'operational',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: '1.0.0'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: `Path ${url.pathname} not found`
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  },
});

console.log(`✅ Backend service listening on http://localhost:${PORT}`);
