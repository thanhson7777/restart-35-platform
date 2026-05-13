#!/bin/bash

# =============================================================================
# RAG Platform E2E Integration Test Script
# =============================================================================
# This script tests the full flow: Frontend → Backend → AI Service → MongoDB
#
# Usage: bash scripts/integration_test.sh
#
# Prerequisites:
# 1. MongoDB running on localhost:27017
# 2. Redis running on localhost:6379
# 3. Backend running on localhost:3000
# 4. AI Service running on localhost:8000
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3000/api/v1"
AI_SERVICE_URL="http://localhost:8000"
API_PREFIX="/v1/ai"

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((SKIPPED++))
}

log_section() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# Check if service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s -f -o /dev/null "$url"; then
        log_success "$name is running"
        return 0
    else
        log_fail "$name is not accessible at $url"
        return 1
    fi
}

# Make authenticated request
auth_request() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${BACKEND_URL}${endpoint}"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            "${BACKEND_URL}${endpoint}"
    fi
}

# Make public request
public_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${BACKEND_URL}${endpoint}"
    else
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            "${BACKEND_URL}${endpoint}"
    fi
}

# =============================================================================
# Setup
# =============================================================================

log_section "SETUP: Checking Services"

# Check services
check_service "$BACKEND_URL/health" "Backend API" || log_skip "Backend not running - skipping tests"
check_service "$AI_SERVICE_URL/health" "AI Service" || log_skip "AI Service not running - skipping tests"

# Check MongoDB
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        log_success "MongoDB is running"
    else
        log_fail "MongoDB is not accessible"
    fi
else
    log_info "mongosh not found - skipping MongoDB check"
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        log_success "Redis is running"
    else
        log_fail "Redis is not accessible"
    fi
else
    log_info "redis-cli not found - skipping Redis check"
fi

# =============================================================================
# Get Test Token (if available)
# =============================================================================

log_section "AUTH: Getting Test Token"

# Try to login with test credentials
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-testpassword123}"

TOKEN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "${BACKEND_URL}/auth/login")

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    log_success "Got authentication token"
else
    log_info "Could not get auth token - some tests will be skipped"
    TOKEN=""
fi

# =============================================================================
# Test AI Service Health
# =============================================================================

log_section "TESTING: AI Service Health"

# Test AI service health endpoint
HEALTH_RESPONSE=$(curl -s "${AI_SERVICE_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "status"; then
    log_success "AI Service health check passed"
else
    log_fail "AI Service health check failed"
fi

# Test RAG health endpoint
RAG_HEALTH=$(curl -s "${AI_SERVICE_URL}${API_PREFIX}/rag/health")
if echo "$RAG_HEALTH" | grep -q "status"; then
    log_success "RAG health endpoint working"
else
    log_fail "RAG health endpoint failed"
fi

# Test RAG sources endpoint
RAG_SOURCES=$(curl -s "${AI_SERVICE_URL}${API_PREFIX}/rag/sources")
if echo "$RAG_SOURCES" | grep -q "sources"; then
    log_success "RAG sources endpoint working"
else
    log_fail "RAG sources endpoint failed"
fi

# =============================================================================
# Test Backend RAG Endpoints
# =============================================================================

log_section "TESTING: Backend RAG Endpoints"

if [ -z "$TOKEN" ]; then
    log_skip "No auth token - skipping authenticated tests"
else
    # Test GET /rag/career-recommendation (unauthenticated should fail)
    UNAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Content-Type: application/json" \
        "${BACKEND_URL}${API_PREFIX}/rag/career-recommendation")
    
    HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        log_success "Unauthenticated request correctly rejected (HTTP $HTTP_CODE)"
    else
        log_fail "Unauthenticated request should return 401/403, got $HTTP_CODE"
    fi
    
    # Test POST /rag/career-recommendation with auth
    PROFILE_DATA='{
        "basicInfo": {
            "age": 40,
            "gender": "male",
            "province": "HCM",
            "education": "university"
        },
        "employmentHistory": [
            {
                "industry": "technology",
                "role": "Software Engineer",
                "years": 10,
                "skills": ["JavaScript", "React", "Node.js"]
            }
        ],
        "aspirations": {
            "targetJob": "Tech Lead",
            "targetIndustry": "technology",
            "skills": ["Leadership", "System Design"]
        },
        "barriers": {}
    }'
    
    RAG_RESPONSE=$(auth_request "POST" "${API_PREFIX}/rag/career-recommendation" "$TOKEN" "$PROFILE_DATA")
    
    if echo "$RAG_RESPONSE" | grep -q '"success":true'; then
        log_success "POST /rag/career-recommendation successful"
    else
        log_fail "POST /rag/career-recommendation failed"
        echo "Response: $RAG_RESPONSE"
    fi
    
    # Test GET /rag/career-recommendation (should return cached)
    GET_RESPONSE=$(auth_request "GET" "${API_PREFIX}/rag/career-recommendation" "$TOKEN" "")
    
    if echo "$GET_RESPONSE" | grep -q '"success":true'; then
        log_success "GET /rag/career-recommendation successful"
    else
        log_fail "GET /rag/career-recommendation failed"
    fi
fi

# =============================================================================
# Test Public Backend Endpoints
# =============================================================================

log_section "TESTING: Public Backend Endpoints"

# Test RAG health through backend
BACKEND_RAG_HEALTH=$(curl -s "${BACKEND_URL}${API_PREFIX}/rag/health")
if echo "$BACKEND_RAG_HEALTH" | grep -q "status"; then
    log_success "Backend RAG health endpoint working"
else
    log_fail "Backend RAG health endpoint failed"
fi

# Test RAG sources through backend
BACKEND_RAG_SOURCES=$(curl -s "${BACKEND_URL}${API_PREFIX}/rag/sources")
if echo "$BACKEND_RAG_SOURCES" | grep -q "sources"; then
    log_success "Backend RAG sources endpoint working"
else
    log_fail "Backend RAG sources endpoint failed"
fi

# =============================================================================
# Test Backend Health
# =============================================================================

log_section "TESTING: Backend Health"

BACKEND_HEALTH=$(curl -s "${BACKEND_URL}/health")
if echo "$BACKEND_HEALTH" | grep -q '"status"'; then
    log_success "Backend health check passed"
else
    log_fail "Backend health check failed"
fi

# =============================================================================
# Data Integrity Tests
# =============================================================================

log_section "TESTING: Data Integrity"

if [ -n "$TOKEN" ]; then
    # Verify that cached data has correct structure
    CACHED_DATA=$(auth_request "GET" "${API_PREFIX}/rag/career-recommendation" "$TOKEN" "")
    
    if echo "$CACHED_DATA" | grep -q '"best_fits"'; then
        log_success "Cached data contains best_fits"
    else
        log_fail "Cached data missing best_fits"
    fi
    
    if echo "$CACHED_DATA" | grep -q '"meta"'; then
        log_success "Cached data contains meta information"
    else
        log_fail "Cached data missing meta information"
    fi
    
    if echo "$CACHED_DATA" | grep -q '"generatedAt"'; then
        log_success "Cached data has timestamp"
    else
        log_fail "Cached data missing timestamp"
    fi
else
    log_skip "No token - skipping data integrity tests"
fi

# =============================================================================
# Performance Tests
# =============================================================================

log_section "TESTING: Performance"

# Test RAG sources response time
START_TIME=$(date +%s%N)
curl -s "${AI_SERVICE_URL}${API_PREFIX}/rag/sources" > /dev/null
END_TIME=$(date +%s%N)
RAG_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$RAG_TIME" -lt 1000 ]; then
    log_success "RAG sources response time: ${RAG_TIME}ms (acceptable)"
else
    log_fail "RAG sources response time too slow: ${RAG_TIME}ms"
fi

# Test backend health response time
START_TIME=$(date +%s%N)
curl -s "${BACKEND_URL}/health" > /dev/null
END_TIME=$(date +%s%N)
BACKEND_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$BACKEND_TIME" -lt 500 ]; then
    log_success "Backend health response time: ${BACKEND_TIME}ms (acceptable)"
else
    log_fail "Backend health response time too slow: ${BACKEND_TIME}ms"
fi

# =============================================================================
# Summary
# =============================================================================

log_section "TEST SUMMARY"

TOTAL=$((PASSED + FAILED + SKIPPED))

echo ""
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo -e "${BLUE}Total:${NC}   $TOTAL"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
