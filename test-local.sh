#!/bin/bash

# Local testing script (without Docker/Traefik)
# Tests the auth proxy system using Node.js

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
PROXY_PORT=3001
PASSWORDS="supersecret,anotherpassword,token123"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"
    if [ -f /tmp/backend.pid ]; then
        kill $(cat /tmp/backend.pid) 2>/dev/null || true
        rm /tmp/backend.pid
    fi
    if [ -f /tmp/proxy.pid ]; then
        kill $(cat /tmp/proxy.pid) 2>/dev/null || true
        rm /tmp/proxy.pid
    fi
    echo -e "${GREEN}Cleanup complete${NC}"
}

# Set trap for cleanup on exit
trap cleanup EXIT INT TERM

echo "========================================="
echo -e "${BLUE}🧪 Auth Proxy Local Test Suite${NC}"
echo "========================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Starting services...${NC}"

# Start backend
cd backend
PORT=$BACKEND_PORT node index.node.mjs > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/backend.pid
cd ..

sleep 2

# Start auth proxy
cd auth-proxy
VALID_PASSWORDS="$PASSWORDS" TARGET_URL="http://localhost:$BACKEND_PORT" PORT=$PROXY_PORT node index.node.mjs > /tmp/auth-proxy.log 2>&1 &
PROXY_PID=$!
echo $PROXY_PID > /tmp/proxy.pid
cd ..

sleep 2

# Check if services are running
if ! ps -p $BACKEND_PID > /dev/null; then
    echo -e "${RED}Failed to start backend${NC}"
    cat /tmp/backend.log
    exit 1
fi

if ! ps -p $PROXY_PID > /dev/null; then
    echo -e "${RED}Failed to start auth proxy${NC}"
    cat /tmp/auth-proxy.log
    exit 1
fi

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID, Port: $BACKEND_PORT)${NC}"
echo -e "${GREEN}✓ Auth Proxy started (PID: $PROXY_PID, Port: $PROXY_PORT)${NC}"
echo ""

# Test counters
tests_run=0
tests_passed=0
tests_failed=0

# Test function
run_test() {
    local test_name=$1
    local expected_status=$2
    local curl_command=$3

    tests_run=$((tests_run + 1))
    echo -e "${YELLOW}Test $tests_run: $test_name${NC}"

    http_code=$(eval "$curl_command -w '%{http_code}' -o /tmp/test_response.txt -s")

    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        tests_passed=$((tests_passed + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
        tests_failed=$((tests_failed + 1))
    fi

    # Show response (first 200 chars)
    response=$(cat /tmp/test_response.txt)
    if [ ${#response} -gt 200 ]; then
        echo "${response:0:200}..."
    else
        echo "$response"
    fi
    echo ""
}

echo "========================================="
echo "Running Tests"
echo "========================================="
echo ""

# Run tests
run_test "Health check (no auth)" 200 \
    "curl http://localhost:$PROXY_PORT/health"

run_test "No authentication (should fail)" 401 \
    "curl http://localhost:$PROXY_PORT/"

run_test "Invalid password (should fail)" 401 \
    "curl -H 'Authorization: Bearer wrongpassword' http://localhost:$PROXY_PORT/"

run_test "Valid password - supersecret" 200 \
    "curl -H 'Authorization: Bearer supersecret' http://localhost:$PROXY_PORT/"

run_test "Valid password - token123" 200 \
    "curl -H 'Authorization: Bearer token123' http://localhost:$PROXY_PORT/api/data"

run_test "Query parameter auth" 200 \
    "curl 'http://localhost:$PROXY_PORT/api/users?password=anotherpassword'"

run_test "API /api/status" 200 \
    "curl -H 'Authorization: Bearer supersecret' http://localhost:$PROXY_PORT/api/status"

run_test "404 for nonexistent endpoint" 404 \
    "curl -H 'Authorization: Bearer supersecret' http://localhost:$PROXY_PORT/api/nonexistent"

run_test "POST request proxying" 200 \
    "curl -X POST -H 'Authorization: Bearer supersecret' http://localhost:$PROXY_PORT/"

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Total tests: $tests_run"
echo -e "${GREEN}Passed: $tests_passed${NC}"
echo -e "${RED}Failed: $tests_failed${NC}"
echo ""

# Show service logs
if [ $tests_failed -gt 0 ]; then
    echo "========================================="
    echo "Service Logs"
    echo "========================================="
    echo ""
    echo "Backend log:"
    cat /tmp/backend.log
    echo ""
    echo "Auth Proxy log:"
    cat /tmp/auth-proxy.log
fi

if [ $tests_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
