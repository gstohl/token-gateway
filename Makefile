.PHONY: help up down logs build restart test clean ps

help:
	@echo "Auth Proxy - Available Commands:"
	@echo ""
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - View logs (all services)"
	@echo "  make build     - Build/rebuild all services"
	@echo "  make restart   - Restart all services"
	@echo "  make test      - Run test requests"
	@echo "  make clean     - Stop and remove all containers, networks, volumes"
	@echo "  make ps        - Show running containers"
	@echo ""

up:
	@echo "Starting services..."
	docker-compose up -d
	@echo ""
	@echo "Services started! Access points:"
	@echo "  - Main API: http://localhost"
	@echo "  - Traefik Dashboard: http://localhost:8080"
	@echo ""
	@echo "Test with:"
	@echo "  curl -H \"Authorization: Bearer supersecret\" http://localhost/"

down:
	@echo "Stopping services..."
	docker-compose down

logs:
	docker-compose logs -f

build:
	@echo "Building services..."
	docker-compose build
	@echo "Build complete!"

restart:
	@echo "Restarting services..."
	docker-compose restart

test:
	@echo "Running authentication tests..."
	@echo ""
	@echo "Test 1: No authentication (should fail with 401)"
	@curl -s http://localhost/ | jq . || echo "Request failed as expected"
	@echo ""
	@echo "Test 2: Valid authentication (should succeed)"
	@curl -s -H "Authorization: Bearer supersecret" http://localhost/ | jq .
	@echo ""
	@echo "Test 3: Get API data"
	@curl -s -H "Authorization: Bearer supersecret" http://localhost/api/data | jq .
	@echo ""
	@echo "Test 4: Health check (no auth required)"
	@curl -s http://localhost/health
	@echo ""

clean:
	@echo "Cleaning up everything..."
	docker-compose down -v
	@echo "Cleanup complete!"

ps:
	docker-compose ps
