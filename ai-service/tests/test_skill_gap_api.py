# -*- coding: utf-8 -*-
"""
Integration Tests for Skill Gap API
================================
Tests cho Skill Gap Analysis API endpoints.

Run with pytest:
    cd ai-service
    python -m pytest tests/test_skill_gap_api.py -v

Author: Restart-35
Date: 2026-06-01
"""

import sys
import os

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app


# Create test client once
client = TestClient(app)


class TestSkillGapAPI:
    """Test cases for Skill Gap API endpoints"""

    def test_health_endpoint(self):
        """Test /api/v1/skill-gap/health endpoint"""
        response = client.get("/api/v1/skill-gap/health")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert "engine_initialized" in data
        assert "cache_enabled" in data
        assert "llm_available" in data

        print("  [PASS] Health endpoint")

    def test_stats_endpoint(self):
        """Test /api/v1/skill-gap/stats endpoint"""
        response = client.get("/api/v1/skill-gap/stats")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] == True
        assert "data" in data

        print("  [PASS] Stats endpoint")

    def test_metrics_endpoint(self):
        """Test /api/v1/skill-gap/metrics endpoint"""
        response = client.get("/api/v1/skill-gap/metrics")

        assert response.status_code == 200
        data = response.json()

        assert "total_requests" in data
        assert "avg_latency_ms" in data
        assert "p95_latency_ms" in data

        print("  [PASS] Metrics endpoint")

    def test_analyze_endpoint_basic(self):
        """Test /api/v1/skill-gap/analyze basic functionality"""
        response = client.post(
            "/api/v1/skill-gap/analyze",
            json={
                "user_skills": ["Excel", "Word"],
                "target_occupation": "Ke toan",
                "use_llm": False  # Use fast mode for testing
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] == True
        assert "data" in data
        assert "skill_gaps" in data["data"]
        assert "timing" in data
        assert "llm_status" in data

        print(f"  [PASS] Analyze endpoint ({data['timing']['total_ms']}ms)")

    def test_analyze_with_llm(self):
        """Test /api/v1/skill-gap/analyze with LLM"""
        response = client.post(
            "/api/v1/skill-gap/analyze",
            json={
                "user_skills": ["Excel", "Word", "Ke toan"],
                "target_occupation": "Ke toan truong",
                "use_llm": True,
                "age": 40
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] == True
        assert "skill_gaps" in data["data"]

        print(f"  [PASS] Analyze with LLM ({data['timing']['total_ms']}ms)")

    def test_analyze_validation(self):
        """Test request validation"""
        # Missing required field
        response = client.post(
            "/api/v1/skill-gap/analyze",
            json={
                "user_skills": ["Excel"]
                # Missing target_occupation
            }
        )
        assert response.status_code == 422  # Validation error

        print("  [PASS] Request validation")

    def test_compare_endpoint(self):
        """Test /api/v1/skill-gap/compare endpoint"""
        response = client.get(
            "/api/v1/skill-gap/compare",
            params={
                "user_skills": "Excel,Word,Ke toan",
                "target_occupation": "Ke toan"
            }
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] == True
        assert "data" in data

        result = data["data"]
        assert "has_skills" in result
        assert "missing_skills" in result
        assert "match_rate" in result

        print(f"  [PASS] Compare endpoint (match: {result['match_rate']:.0%})")

    def test_batch_endpoint(self):
        """Test /api/v1/skill-gap/batch endpoint"""
        response = client.post(
            "/api/v1/skill-gap/batch",
            json=[
                {
                    "user_skills": ["Excel"],
                    "target_occupation": "Ke toan",
                    "use_llm": False
                },
                {
                    "user_skills": ["Python", "SQL"],
                    "target_occupation": "Data Analyst",
                    "use_llm": False
                }
            ]
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] == True
        assert data["total"] == 2
        assert "results" in data
        assert len(data["results"]) == 2

        print(f"  [PASS] Batch endpoint ({data['total']} requests)")

    def test_batch_limit(self):
        """Test batch limit (max 10)"""
        requests = [
            {
                "user_skills": ["Excel"],
                "target_occupation": f"Job {i}",
                "use_llm": False
            }
            for i in range(15)  # Over limit
        ]

        response = client.post(
            "/api/v1/skill-gap/batch",
            json=requests
        )

        assert response.status_code == 400

        print("  [PASS] Batch limit enforced")

    def test_cache_invalidate(self):
        """Test /api/v1/skill-gap/cache/invalidate endpoint"""
        response = client.post("/api/v1/skill-gap/cache/invalidate")

        assert response.status_code == 200
        data = response.json()

        assert "success" in data

        print("  [PASS] Cache invalidate")

    def test_response_structure(self):
        """Test complete response structure"""
        response = client.post(
            "/api/v1/skill-gap/analyze",
            json={
                "user_skills": ["Excel", "Word"],
                "target_occupation": "Ke toan",
                "use_llm": False
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Full structure validation
        assert "success" in data
        assert data["success"] == True

        # Data structure
        data_section = data["data"]
        assert "skill_gaps" in data_section
        assert "summary" in data_section
        assert "prefilter_results" in data_section
        assert "stats" in data_section
        assert "user_profile" in data_section

        print("  [PASS] Response structure complete")


class TestSkillGapCache:
    """Test cases for cache service"""

    def test_cache_set_get(self):
        """Test basic cache set/get"""
        from services.cache_service import get_cache, reset_cache

        reset_cache()
        cache = get_cache()

        test_data = {
            "skill_gaps": [
                {"skill_name": "SQL", "priority": "essential"}
            ]
        }

        # Set
        result = cache.set(
            ["Excel", "Word"],
            "Ke toan",
            test_data,
            ttl=60
        )
        assert result == True

        # Get
        cached = cache.get(["Excel", "Word"], "Ke toan")
        assert cached is not None
        assert cached["skill_gaps"][0]["skill_name"] == "SQL"

        print("  [PASS] Cache set/get")

    def test_cache_miss(self):
        """Test cache miss"""
        from services.cache_service import get_cache, reset_cache

        reset_cache()
        cache = get_cache()

        cached = cache.get(["NonExistent"], "Job")
        assert cached is None

        print("  [PASS] Cache miss")


class TestSkillGapMetrics:
    """Test cases for metrics service"""

    def test_metrics_record(self):
        """Test metrics recording"""
        from services.metrics_service import get_metrics_service, reset_metrics

        reset_metrics()
        metrics = get_metrics_service()

        # Record some requests
        metrics.record_request("test/endpoint", 100.0)
        metrics.record_request("test/endpoint", 200.0)
        metrics.record_request("test/endpoint", 150.0, error="Test error")

        # Get metrics
        result = metrics.get_metrics()

        assert result["overall"]["total_requests"] >= 3
        assert result["overall"]["total_errors"] >= 1

        print("  [PASS] Metrics recording")

    def test_metrics_percentiles(self):
        """Test percentile calculations"""
        from services.metrics_service import get_metrics_service, reset_metrics

        reset_metrics()
        metrics = get_metrics_service()

        # Record many requests
        for i in range(100):
            metrics.record_request("test/perf", float(i * 10))

        result = metrics.get_metrics()

        assert result["overall"]["p95_latency_ms"] > 0
        assert result["overall"]["p99_latency_ms"] > 0

        print(f"  [PASS] Percentiles (P95: {result['overall']['p95_latency_ms']:.0f}ms)")


if __name__ == "__main__":
    # Simple manual test runner
    print("=" * 60)
    print("PHASE 4: SKILL GAP API - TESTS")
    print("=" * 60)
    print("\nRun with pytest for full test suite:")
    print("  python -m pytest tests/test_skill_gap_api.py -v")
    print("=" * 60)
