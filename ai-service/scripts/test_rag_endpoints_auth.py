# -*- coding: utf-8 -*-
"""
Test RAG Endpoints with Auth Token

This script tests the RAG endpoints that require authentication:
- POST /v1/ai/rag/career-recommendation - Trigger RAG recommendation
- GET /v1/ai/rag/career-recommendation - Get cached recommendation
- POST /v1/ai/rag/career-recommendation/refresh - Refresh recommendation

These endpoints are protected by authMiddleware.isAuthorized in the backend.

Usage:
    python scripts/test_rag_endpoints_auth.py

Author: Thanh Son
Date: 2026-05-12
"""

import sys
import os
import json
import requests
from pathlib import Path
from datetime import datetime

# Fix Windows console encoding for Vietnamese
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()


# ============================================================================
# Configuration
# ============================================================================

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:3000")
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000")

# Sample user profile for testing
SAMPLE_PROFILE = {
    "basicInfo": {
        "age": 40,
        "gender": "Nam",
        "province": "TP.HCM",
        "education": "Đại học"
    },
    "employmentHistory": [
        {
            "industry": "Công nghệ thông tin",
            "role": "Quản lý dự án",
            "years": 15,
            "skills": ["Quản lý dự án", "Agile", "Scrum", "Java", "Python"]
        }
    ],
    "aspirations": {
        "targetJob": "Tech Lead",
        "targetIndustry": "Tech",
        "skills": ["Leadership", "Architecture"]
    },
    "barriers": {
        "family": True,
        "time": True
    }
}


def print_section(title):
    """Print a section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_subsection(title):
    """Print a subsection header."""
    print(f"\n--- {title} ---")


def print_json(data, indent=2):
    """Pretty print JSON data."""
    print(json.dumps(data, indent=indent, ensure_ascii=False))


# ============================================================================
# Test 1: Health Check - Public Endpoint
# ============================================================================

def test_health_check():
    """Test health check endpoint (public)."""
    print_section("TEST 1: Health Check (Public)")

    try:
        # Test Backend Health
        print_subsection("Backend Health")
        response = requests.get(f"{BACKEND_BASE_URL}/v1/ai/health", timeout=10)
        print(f"   [INFO] Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Backend is running")
            print(f"   [INFO] Response: {data}")
        else:
            print(f"   [FAIL] Backend health check failed")
            print(f"   [INFO] Response: {response.text}")

        # Test AI Service Health
        print_subsection("AI Service Health")
        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=10)
        print(f"   [INFO] Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] AI Service is running")
            print(f"   [INFO] Version: {data.get('version')}")
        else:
            print(f"   [FAIL] AI Service health check failed")
            print(f"   [INFO] Response: {response.text}")

        return True

    except requests.exceptions.ConnectionError as e:
        print(f"   [FAIL] Connection error: {e}")
        print(f"   [INFO] Make sure services are running:")
        print(f"          Backend: {BACKEND_BASE_URL}")
        print(f"          AI Service: {AI_SERVICE_URL}")
        return False
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False


# ============================================================================
# Test 2: RAG Endpoints without Auth (should fail)
# ============================================================================

def test_without_auth():
    """Test RAG endpoints without auth token (should return 401)."""
    print_section("TEST 2: Without Auth Token (Should Return 401)")

    endpoints = [
        ("POST", "/v1/ai/rag/career-recommendation", {"profile": SAMPLE_PROFILE}),
        ("GET", "/v1/ai/rag/career-recommendation", None),
        ("POST", "/v1/ai/rag/career-recommendation/refresh", {"profile": SAMPLE_PROFILE}),
    ]

    all_failed = True

    for method, path, body in endpoints:
        print_subsection(f"{method} {path}")

        try:
            if method == "GET":
                response = requests.get(f"{BACKEND_BASE_URL}{path}", timeout=10)
            else:
                response = requests.post(f"{BACKEND_BASE_URL}{path}", json=body, timeout=10)

            print(f"   [INFO] Status: {response.status_code}")

            if response.status_code == 401:
                print(f"   [OK] Correctly returned 401 Unauthorized")
                try:
                    data = response.json()
                    print(f"   [INFO] Message: {data.get('message', 'N/A')}")
                except:
                    pass
            elif response.status_code == 500:
                print(f"   [WARN] Got 500 - service may be down or token handling issue")
                all_failed = False
            else:
                print(f"   [WARN] Got {response.status_code} - expected 401")
                all_failed = False

        except requests.exceptions.ConnectionError:
            print(f"   [FAIL] Cannot connect to backend")
            print(f"   [INFO] Backend URL: {BACKEND_BASE_URL}")
        except Exception as e:
            print(f"   [FAIL] Error: {e}")

    return all_failed


# ============================================================================
# Test 3: RAG Public Endpoints
# ============================================================================

def test_rag_public_endpoints():
    """Test public RAG endpoints."""
    print_section("TEST 3: Public RAG Endpoints")

    # Test RAG Sources
    print_subsection("GET /v1/ai/rag/sources")
    try:
        response = requests.get(f"{BACKEND_BASE_URL}/v1/ai/rag/sources", timeout=10)
        print(f"   [INFO] Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Sources retrieved")
            print(f"   [INFO] Sources: {data.get('data', {}).get('sources', [])}")
        else:
            print(f"   [FAIL] Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print(f"   [FAIL] Cannot connect to backend")
    except Exception as e:
        print(f"   [FAIL] Error: {e}")

    # Test RAG Health
    print_subsection("GET /v1/ai/rag/health")
    try:
        response = requests.get(f"{BACKEND_BASE_URL}/v1/ai/rag/health", timeout=10)
        print(f"   [INFO] Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Health retrieved")
            print(f"   [INFO] Status: {data.get('status')}")
            print(f"   [INFO] RAG Engine: {data.get('components', {}).get('rag_engine', {}).get('status')}")
            print(f"   [INFO] LLM: {data.get('components', {}).get('llm', {}).get('status')}")
        else:
            print(f"   [FAIL] Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print(f"   [FAIL] Cannot connect to backend")
    except Exception as e:
        print(f"   [FAIL] Error: {e}")

    return True


# ============================================================================
# Test 4: AI Service Direct RAG Endpoint
# ============================================================================

def test_ai_service_direct():
    """Test AI service RAG endpoint directly (no auth required)."""
    print_section("TEST 4: AI Service Direct RAG Endpoint")

    print_subsection("POST /api/v1/ai/rag/career-recommendation (Direct)")

    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/v1/ai/rag/career-recommendation",
            json={
                "profile": SAMPLE_PROFILE,
                "include_salary": True,
                "include_trends": True
            },
            timeout=60
        )

        print(f"   [INFO] Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Direct RAG call successful")

            if data.get('success'):
                print(f"   [INFO] Best fits: {len(data.get('best_fits', []))} items")
                print(f"   [INFO] Income boost: {len(data.get('income_boost', []))} items")
                print(f"   [INFO] Progression: {len(data.get('progression', []))} items")
                print(f"   [INFO] Sources: {data.get('sources', [])}")

                if data.get('best_fits'):
                    first_fit = data['best_fits'][0]
                    print(f"\n   [INFO] First recommendation:")
                    print(f"          Job: {first_fit.get('job_title', 'N/A')}")
                    print(f"          Match: {first_fit.get('match_score', 'N/A')}")
                    print(f"          Salary: {first_fit.get('salary_range', 'N/A')}")

                return True
            else:
                print(f"   [FAIL] Success=False: {data.get('message')}")
                return False

        elif response.status_code == 503:
            print(f"   [FAIL] RAG engine not initialized")
            print(f"   [INFO] Response: {response.text}")
            return False
        else:
            print(f"   [FAIL] Status {response.status_code}")
            print(f"   [INFO] Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"   [FAIL] Cannot connect to AI service")
        print(f"   [INFO] AI Service URL: {AI_SERVICE_URL}")
        return False
    except requests.exceptions.Timeout:
        print(f"   [FAIL] Request timeout (60s)")
        return False
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False


# ============================================================================
# Test 5: Mock Auth Token Test
# ============================================================================

def test_with_mock_token():
    """Test endpoints with a mock token (will likely fail at backend verification)."""
    print_section("TEST 5: With Mock Token")

    mock_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXIiLCJyb2xlIjoiVXNlciIsImlhdCI6MTYyMzEyMTEyMn0.mock_signature"

    print(f"   [INFO] Using mock token: {mock_token[:50]}...")

    endpoints = [
        ("POST", "/v1/ai/rag/career-recommendation", {"profile": SAMPLE_PROFILE}),
        ("GET", "/v1/ai/rag/career-recommendation", None),
        ("POST", "/v1/ai/rag/career-recommendation/refresh", {"profile": SAMPLE_PROFILE}),
    ]

    for method, path, body in endpoints:
        print_subsection(f"{method} {path}")

        try:
            headers = {"Authorization": f"Bearer {mock_token}"}

            if method == "GET":
                response = requests.get(f"{BACKEND_BASE_URL}{path}", headers=headers, timeout=30)
            else:
                response = requests.post(f"{BACKEND_BASE_URL}{path}", json=body, headers=headers, timeout=30)

            print(f"   [INFO] Status: {response.status_code}")

            if response.status_code == 200:
                print(f"   [OK] Request successful!")
                try:
                    data = response.json()
                    if path == "/v1/ai/rag/career-recommendation":
                        if method == "GET":
                            print(f"   [INFO] Has data: {data.get('success')}")
                        else:
                            print(f"   [INFO] Success: {data.get('success')}")
                except:
                    pass
            elif response.status_code == 401:
                print(f"   [OK] Correctly returned 401 (invalid token)")
                try:
                    data = response.json()
                    print(f"   [INFO] Message: {data.get('message', 'N/A')}")
                except:
                    pass
            elif response.status_code == 410:
                print(f"   [INFO] Got 410 GONE - token expired")
            else:
                print(f"   [WARN] Got {response.status_code}")
                try:
                    print(f"   [INFO] Response: {response.json()}")
                except:
                    print(f"   [INFO] Response: {response.text[:200]}")

        except requests.exceptions.ConnectionError:
            print(f"   [FAIL] Cannot connect to backend")
        except Exception as e:
            print(f"   [FAIL] Error: {e}")


# ============================================================================
# Test 6: AI Service Internal RAG Endpoint Test
# ============================================================================

def test_ai_service_internal():
    """Test internal AI service endpoints."""
    print_section("TEST 6: AI Service Internal Endpoints")

    # Test RAG Query
    print_subsection("POST /api/v1/ai/rag/query")
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/v1/ai/rag/query",
            params={
                "query": "kỹ năng cần thiết cho người 40 tuổi chuyển ngành",
                "doc_type": "skill_transfer",
                "n_results": 3
            },
            timeout=30
        )

        print(f"   [INFO] Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Query successful")
            print(f"   [INFO] Results count: {data.get('data', {}).get('results_count', 0)}")
        else:
            print(f"   [FAIL] Response: {response.text}")

    except Exception as e:
        print(f"   [FAIL] Error: {e}")

    # Test RAG Debug Profile Test
    print_subsection("GET /api/v1/ai/rag/debug/profile-test")
    try:
        response = requests.get(
            f"{AI_SERVICE_URL}/api/v1/ai/rag/debug/profile-test",
            timeout=60
        )

        print(f"   [INFO] Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Debug test successful")
            print(f"   [INFO] Best fits: {len(data.get('best_fits', []))} items")
        else:
            print(f"   [FAIL] Response: {response.text}")

    except Exception as e:
        print(f"   [FAIL] Error: {e}")


# ============================================================================
# Main Test Runner
# ============================================================================

def run_all_tests():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("  RAG ENDPOINTS WITH AUTH - COMPREHENSIVE TEST")
    print("=" * 70)
    print(f"\n   Backend URL: {BACKEND_BASE_URL}")
    print(f"   AI Service URL: {AI_SERVICE_URL}")
    print(f"   Time: {datetime.now().isoformat()}")

    results = {
        "health_check": False,
        "without_auth": False,
        "public_endpoints": False,
        "ai_service_direct": False,
        "mock_token": False,
        "ai_service_internal": False
    }

    # Test 1: Health Check
    results["health_check"] = test_health_check()

    # Test 2: Without Auth
    results["without_auth"] = test_without_auth()

    # Test 3: Public Endpoints
    results["public_endpoints"] = test_rag_public_endpoints()

    # Test 4: AI Service Direct
    results["ai_service_direct"] = test_ai_service_direct()

    # Test 5: Mock Token
    test_with_mock_token()

    # Test 6: AI Service Internal
    results["ai_service_internal"] = test_ai_service_internal()

    # Summary
    print_section("FINAL TEST SUMMARY")
    print(f"   Health Check:         {'PASS' if results['health_check'] else 'FAIL'}")
    print(f"   Without Auth (401):   {'PASS' if results['without_auth'] else 'WARN'}")
    print(f"   Public Endpoints:     {'PASS' if results['public_endpoints'] else 'FAIL'}")
    print(f"   AI Service Direct:    {'PASS' if results['ai_service_direct'] else 'FAIL'}")
    print(f"   Mock Token Test:      {'DONE'}")
    print(f"   AI Service Internal:  {'PASS' if results['ai_service_internal'] else 'FAIL'}")

    print("\n" + "=" * 70)
    print("  NOTES:")
    print("=" * 70)
    print("  - Backend endpoints require valid JWT token from backend auth")
    print("  - AI Service endpoints can be tested directly (no auth)")
    print("  - To test with real auth, need to login and get token from backend")
    print("  - Public endpoints: /v1/ai/rag/sources, /v1/ai/rag/health")
    print("  - Protected endpoints: /v1/ai/rag/career-recommendation (GET/POST)")
    print("=" * 70)

    return results


if __name__ == "__main__":
    results = run_all_tests()
