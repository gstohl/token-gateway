#!/bin/bash

# Test script for Auth Proxy
# Tests various authentication scenarios

set -e

BASE_URL="http://localhost"
VALID_PASSWORD="supersecret"
INVALID_PASSWORD="wrongpassword"

echo "================================"
echo "Auth Proxy Test Suite"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

# Function to run a test
run_test() {
    local test_name=$1
    local expected_code=$2
    local curl_command=$3

    test_count=$((test_count + 1))
    echo -e "${YELLOW}Test $test_count: $test_name${NC}"

    http_code=$(eval "$curl_command -w '%{http_code}' -o /tmp/test_response.txt -s")

    if [ "$http_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        pass_count=$((pass_count + 1))
        cat /tmp/test_response.txt | jq . 2>/dev/null || cat /tmp/test_response.txt
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $http_code)"
        fail_count=$((fail_count + 1))
        cat /tmp/test_response.txt
    fi
    echo ""
}

# Test 1: No authentication
run_test "No authentication (should return 401)" 401 \
    "curl $BASE_URL/"

# Test 2: Invalid password
run_test "Invalid password (should return 401)" 401 \
    "curl -H 'Authorization: Bearer $INVALID_PASSWORD' $BASE_URL/"

# Test 3: Valid password (Bearer token)
run_test "Valid password with Bearer token (should return 200)" 200 \
    "curl -H 'Authorization: Bearer $VALID_PASSWORD' $BASE_URL/"

# Test 4: Valid password (query parameter)
run_test "Valid password with query parameter (should return 200)" 200 \
    "curl '$BASE_URL/?password=$VALID_PASSWORD'"

# Test 5: API endpoint with auth
run_test "API endpoint /api/data with auth (should return 200)" 200 \
    "curl -H 'Authorization: Bearer $VALID_PASSWORD' $BASE_URL/api/data"

# Test 6: API endpoint without auth
run_test "API endpoint /api/data without auth (should return 401)" 401 \
    "curl $BASE_URL/api/data"

# Test 7: Health check (no auth required)
run_test "Health check endpoint (should return 200)" 200 \
    "curl $BASE_URL/health"

# Test 8: API users endpoint
run_test "API users endpoint with auth (should return 200)" 200 \
    "curl -H 'Authorization: Bearer $VALID_PASSWORD' $BASE_URL/api/users"

# Test 9: API status endpoint
run_test "API status endpoint with auth (should return 200)" 200 \
    "curl -H 'Authorization: Bearer $VALID_PASSWORD' $BASE_URL/api/status"

# Test 10: Invalid endpoint
run_test "Invalid endpoint (should return 404)" 404 \
    "curl -H 'Authorization: Bearer $VALID_PASSWORD' $BASE_URL/api/invalid"

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo "Total tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
