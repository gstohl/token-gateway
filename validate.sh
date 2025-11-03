#!/bin/bash

# TypeScript validation script
# Checks both auth-proxy and backend for type errors

set -e

echo "================================"
echo "TypeScript Validation"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if node_modules exist
check_dependencies() {
    local service=$1
    if [ ! -d "$service/node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies for $service...${NC}"
        cd "$service" && npm install && cd ..
    fi
}

# Validate a service
validate_service() {
    local service=$1
    echo -e "${YELLOW}Validating $service...${NC}"

    if cd "$service" && npx tsc --noEmit; then
        echo -e "${GREEN}✓ $service: No TypeScript errors${NC}"
        cd ..
        return 0
    else
        echo -e "${RED}✗ $service: TypeScript errors found${NC}"
        cd ..
        return 1
    fi
}

# Main validation
echo "Checking dependencies..."
check_dependencies "auth-proxy"
check_dependencies "backend"
echo ""

errors=0

# Validate both services
validate_service "auth-proxy" || errors=$((errors + 1))
echo ""
validate_service "backend" || errors=$((errors + 1))

echo ""
echo "================================"
echo "Validation Summary"
echo "================================"

if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✓ All TypeScript code is valid!${NC}"
    exit 0
else
    echo -e "${RED}✗ Found TypeScript errors in $errors service(s)${NC}"
    exit 1
fi
