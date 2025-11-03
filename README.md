# Auth Proxy with Bun and Traefik

A lightweight authentication proxy built with Bun that protects your backend services with password-based authentication. Uses Traefik for intelligent routing and Docker Compose for easy deployment.

## Features

- **Simple Password Authentication**: Validates requests against a configurable list of passwords
- **High Performance**: Built with Bun for blazing-fast request handling
- **Flexible Authentication**: Supports both Bearer tokens and query parameters
- **Production-Ready Routing**: Traefik handles load balancing and routing
- **Docker Compose Setup**: Everything containerized and ready to deploy
- **Health Checks**: Built-in health check endpoints for monitoring

## Architecture

```
Client Request
     |
     v
[Traefik] :80
     |
     v
[Auth Proxy] :3001 (validates password)
     |
     v
[Backend Service] :3000 (protected)
```

All requests go through Traefik, which routes them to the auth proxy. The auth proxy validates the password, and only then forwards the request to the backend service.

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd token-gateway

# Copy environment template
cp .env.example .env

# Edit .env and set your passwords
nano .env
```

### 2. Configure Passwords

Edit `.env` and set your valid passwords:

```env
VALID_PASSWORDS=supersecret,anotherpassword,token123
```

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Test Authentication

```bash
# This should fail (no auth)
curl http://localhost/

# This should succeed (with valid password)
curl -H "Authorization: Bearer supersecret" http://localhost/

# Alternative: using query parameter
curl "http://localhost/?password=supersecret"

# Test API endpoint
curl -H "Authorization: Bearer supersecret" http://localhost/api/data
```

## Services

### Traefik (Port 80, 8080)
- **Port 80**: Main entry point for all HTTP traffic
- **Port 8080**: Traefik dashboard (http://localhost:8080)
- Routes all requests to auth-proxy
- Provides load balancing and monitoring

### Auth Proxy (Port 3001)
- Validates authentication tokens/passwords
- Proxies authenticated requests to backend
- Returns 401 for invalid/missing credentials
- Built with Bun for maximum performance

### Backend (Port 3000)
- Protected service that requires authentication
- Only accessible through auth-proxy
- Sample API with multiple endpoints

## API Endpoints

All endpoints require authentication via `Authorization: Bearer <password>` header.

### Root
```bash
curl -H "Authorization: Bearer supersecret" http://localhost/
```

### Get Data
```bash
curl -H "Authorization: Bearer supersecret" http://localhost/api/data
```

### Get Users
```bash
curl -H "Authorization: Bearer supersecret" http://localhost/api/users
```

### Get Status
```bash
curl -H "Authorization: Bearer supersecret" http://localhost/api/status
```

### Health Check (no auth required)
```bash
curl http://localhost/health
```

## Authentication Methods

### Method 1: Authorization Header (Recommended)
```bash
curl -H "Authorization: Bearer your-password" http://localhost/api/data
```

### Method 2: Query Parameter (for testing)
```bash
curl "http://localhost/api/data?password=your-password"
```

## Development

### Running Locally (without Docker)

**Terminal 1 - Backend:**
```bash
cd backend
bun install
bun run dev
```

**Terminal 2 - Auth Proxy:**
```bash
cd auth-proxy
export VALID_PASSWORDS="test123,secret456"
export TARGET_URL="http://localhost:3000"
bun install
bun run dev
```

### Project Structure

```
token-gateway/
├── auth-proxy/
│   ├── index.ts          # Auth proxy implementation
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── index.ts          # Sample backend service
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml     # Service orchestration
├── .env.example          # Environment template
└── README.md
```

## Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Rebuild after code changes
docker-compose up -d --build

# Remove everything (including volumes)
docker-compose down -v
```

## Environment Variables

### Auth Proxy
- `VALID_PASSWORDS`: Comma-separated list of valid passwords
- `TARGET_URL`: Backend service URL (default: http://backend:3000)
- `PORT`: Auth proxy port (default: 3001)

### Backend
- `PORT`: Backend service port (default: 3000)

## Security Considerations

1. **Use Strong Passwords**: Choose long, random passwords
2. **Use HTTPS in Production**: Add TLS/SSL certificates to Traefik
3. **Rotate Passwords Regularly**: Update the password list periodically
4. **Environment Variables**: Never commit `.env` to version control
5. **Rate Limiting**: Consider adding rate limiting to prevent brute force
6. **Logging**: Monitor auth proxy logs for suspicious activity

## Production Deployment

For production, you should:

1. Use HTTPS with valid SSL certificates
2. Enable Traefik's ACME (Let's Encrypt) support
3. Set up proper logging and monitoring
4. Use secrets management (Docker Swarm secrets, Kubernetes secrets, etc.)
5. Implement rate limiting
6. Add IP whitelisting if applicable

### Example Traefik HTTPS Configuration

```yaml
# Add to docker-compose.yml traefik service command:
- "--entrypoints.websecure.address=:443"
- "--certificatesresolvers.letsencrypt.acme.email=your@email.com"
- "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
- "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
```

## Troubleshooting

### 502 Bad Gateway
- Check if backend service is running: `docker-compose ps`
- View backend logs: `docker-compose logs backend`
- Verify network connectivity between services

### 401 Unauthorized
- Verify password is in VALID_PASSWORDS list
- Check auth header format: `Authorization: Bearer <password>`
- View auth-proxy logs: `docker-compose logs auth-proxy`

### Traefik Not Routing
- Check Traefik dashboard: http://localhost:8080
- Verify service labels in docker-compose.yml
- Restart Traefik: `docker-compose restart traefik`

## License

MIT

## Contributing

Pull requests are welcome! For major changes, please open an issue first.
