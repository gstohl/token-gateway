# Usage Examples

## Starting the Services

```bash
# Copy environment file
cp .env.example .env

# Edit passwords (use your own!)
nano .env

# Start everything
docker-compose up -d

# Check status
docker-compose ps
```

## Example Requests

### Using curl

```bash
# Basic request with authentication
curl -H "Authorization: Bearer supersecret" http://localhost/

# Get data from API
curl -H "Authorization: Bearer supersecret" http://localhost/api/data

# Without authentication (will fail)
curl http://localhost/

# Using query parameter (testing only)
curl "http://localhost/?password=supersecret"
```

### Using HTTPie

```bash
# Install httpie: pip install httpie

# Authenticated request
http http://localhost/ "Authorization: Bearer supersecret"

# GET data
http http://localhost/api/data "Authorization: Bearer supersecret"

# POST example (if your backend supports it)
http POST http://localhost/api/data name="test" "Authorization: Bearer supersecret"
```

### Using JavaScript/Fetch

```javascript
// Simple fetch example
fetch('http://localhost/api/data', {
  headers: {
    'Authorization': 'Bearer supersecret'
  }
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Async/await example
async function fetchProtectedData() {
  try {
    const response = await fetch('http://localhost/api/data', {
      headers: {
        'Authorization': 'Bearer supersecret'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchProtectedData();
```

### Using Python

```python
import requests

# Simple request
url = 'http://localhost/api/data'
headers = {'Authorization': 'Bearer supersecret'}

response = requests.get(url, headers=headers)
print(response.json())

# With error handling
try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    print(data)
except requests.exceptions.HTTPError as e:
    print(f"HTTP Error: {e}")
except requests.exceptions.RequestException as e:
    print(f"Request Error: {e}")
```

### Using Postman

1. Create a new request
2. Set URL to `http://localhost/api/data`
3. Go to "Authorization" tab
4. Select "Bearer Token"
5. Enter your password (e.g., `supersecret`)
6. Send the request

## Testing Multiple Passwords

```bash
# Set multiple passwords in .env
VALID_PASSWORDS=password1,password2,password3

# Test each one
curl -H "Authorization: Bearer password1" http://localhost/
curl -H "Authorization: Bearer password2" http://localhost/
curl -H "Authorization: Bearer password3" http://localhost/

# Invalid password (should fail)
curl -H "Authorization: Bearer wrongpassword" http://localhost/
```

## Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-proxy
docker-compose logs -f backend
docker-compose logs -f traefik

# Last 100 lines
docker-compose logs --tail=100
```

## Traefik Dashboard

Access the Traefik dashboard at: http://localhost:8080

You can see:
- Active routers
- Services and their health
- Middleware
- Real-time metrics

## Health Checks

```bash
# Check auth proxy health
curl http://localhost/health

# Check individual services (from inside network)
docker-compose exec auth-proxy curl http://localhost:3001/health
docker-compose exec backend curl http://localhost:3000/health
```

## Debugging

### Check if services are running
```bash
docker-compose ps
```

### Inspect network
```bash
docker network ls
docker network inspect token-gateway_gateway
```

### Test backend directly (bypass auth)
```bash
# This should work (inside Docker network)
docker-compose exec auth-proxy curl http://backend:3000/

# This won't work (backend not exposed to host)
curl http://localhost:3000/
```

### Restart specific service
```bash
docker-compose restart auth-proxy
```

### Rebuild after code changes
```bash
docker-compose up -d --build auth-proxy
```

## Advanced: Custom Backend Integration

Replace the sample backend with your own service:

```yaml
# In docker-compose.yml, replace backend service:
backend:
  image: your-backend-image:latest
  # Or use existing service
  # image: registry.example.com/your-app:v1.0
  environment:
    - YOUR_ENV_VARS=value
  networks:
    - gateway
  labels:
    - "traefik.enable=false"  # Keep this!
```

Then update auth-proxy environment:

```yaml
auth-proxy:
  environment:
    - TARGET_URL=http://backend:8080  # Your backend port
```

## Production Considerations

### 1. Use Environment Variables from Secret Store

```bash
# Don't commit .env to git!
# Use Docker secrets, AWS Secrets Manager, etc.

# Example with Docker Swarm secrets:
echo "password1,password2" | docker secret create valid_passwords -

# In docker-compose.yml:
secrets:
  - valid_passwords

services:
  auth-proxy:
    secrets:
      - valid_passwords
    environment:
      - VALID_PASSWORDS_FILE=/run/secrets/valid_passwords
```

### 2. Add Rate Limiting

```yaml
# In docker-compose.yml, add to auth-proxy labels:
labels:
  - "traefik.http.middlewares.rate-limit.ratelimit.average=100"
  - "traefik.http.middlewares.rate-limit.ratelimit.burst=50"
  - "traefik.http.routers.auth-proxy.middlewares=rate-limit"
```

### 3. Enable HTTPS

```yaml
# Add to traefik command:
- "--entrypoints.websecure.address=:443"
- "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
- "--certificatesresolvers.letsencrypt.acme.email=your@email.com"
- "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"

# Update auth-proxy labels:
- "traefik.http.routers.auth-proxy.tls=true"
- "traefik.http.routers.auth-proxy.tls.certresolver=letsencrypt"
```

### 4. Add Logging

```yaml
# Mount log directory
volumes:
  - ./logs:/app/logs

# Update auth-proxy with logging
environment:
  - LOG_LEVEL=info
  - LOG_FILE=/app/logs/auth-proxy.log
```
