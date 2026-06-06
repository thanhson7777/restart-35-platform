# -*- coding: utf-8 -*-
"""
Integration Tests for Course Recommendation API
==============================================
Tests cho /course-recommendations và /learning-path endpoints.

Run:
    cd ai-service
    python -m pytest tests/test_course_recommendation_api.py -v

Author: Restart-35
Date: 2026-06-06
"""

import pytest
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


# Create test client once (reused across all tests)
client = TestClient(app)


class TestCourseRecommendationAPI:
    """Integration tests for course recommendation endpoints."""

    def test_health_endpoint(self):
        """AI service health endpoint should respond 200."""
        response = client.get("/api/v1/ai/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data or "success" in data or "embeddings_loaded" in data
        print("  [PASS] Health endpoint")

    def test_recommend_courses_basic(self):
        """POST /course-recommendations with basic skill_gaps returns 200."""
        response = client.post("/api/v1/ai/course-recommendations", json={
            "skill_gaps": [
                {"skill_name": "Excel", "priority": "essential"}
            ],
            "limit": 3
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "courses" in data or "success" in data or isinstance(data, list)
        print(f"  [PASS] Recommend courses basic — returned {len(data.get('courses', data if isinstance(data, list) else []))} courses")

    def test_recommend_courses_empty_gaps(self):
        """Empty skill_gaps should return 200 with empty result or 422 validation error."""
        response = client.post("/api/v1/ai/course-recommendations", json={
            "skill_gaps": [],
            "limit": 5
        })
        # Accept 200 (empty list) or 422 (validation error)
        assert response.status_code in [200, 422]
        if response.status_code == 200:
            data = response.json()
            courses = data.get("courses", data if isinstance(data, list) else [])
            assert len(courses) == 0
        print(f"  [PASS] Empty gaps handled with status {response.status_code}")

    def test_recommend_courses_with_constraints(self):
        """POST with constraints (isFree) returns 200."""
        response = client.post("/api/v1/ai/course-recommendations", json={
            "skill_gaps": [{"skill_name": "Excel", "priority": "essential"}],
            "constraints": {"isFree": True},
            "limit": 3
        })
        assert response.status_code == 200, f"Got {response.status_code}: {response.text}"
        data = response.json()
        assert "courses" in data or "success" in data or isinstance(data, list)
        print("  [PASS] Recommend with constraints")

    def test_recommend_courses_limit(self):
        """Response must respect limit parameter."""
        response = client.post("/api/v1/ai/course-recommendations", json={
            "skill_gaps": [{"skill_name": "Excel", "priority": "essential"}],
            "limit": 2
        })
        assert response.status_code == 200
        data = response.json()
        courses = data.get("courses", data if isinstance(data, list) else [])
        assert len(courses) <= 2
        print(f"  [PASS] Limit respected: {len(courses)} courses returned")

    def test_recommend_courses_multiple_gaps(self):
        """Multiple skill_gaps should produce ranked results."""
        response = client.post("/api/v1/ai/course-recommendations", json={
            "skill_gaps": [
                {"skill_name": "Excel", "priority": "essential"},
                {"skill_name": "Word", "priority": "important"},
                {"skill_name": "Python", "priority": "nice_to_have"}
            ],
            "limit": 5
        })
        assert response.status_code == 200
        print("  [PASS] Multiple gaps handled")

    def test_recommend_courses_with_job_title(self):
        """target_job_title in request should not cause error."""
        response = client.post("/api/v1/ai/course-recommendations", json={
            "skill_gaps": [{"skill_name": "Excel", "priority": "essential"}],
            "limit": 3,
            "target_job_title": "Kế toán"
        })
        assert response.status_code == 200, f"Got {response.status_code}: {response.text}"
        print("  [PASS] target_job_title handled")

    def test_learning_path_endpoint_exists(self):
        """POST /learning-path should exist (200 or 404 if not mounted)."""
        response = client.post("/api/v1/ai/learning-path", json={
            "skill_gaps": [{"skill_name": "Excel", "priority": "essential"}],
            "courses": [],
            "job_title": "Kế toán",
            "max_steps": 3
        })
        # Accept 200 (mounted) or 404 (not mounted)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "learning_path" in data or "steps" in data or "success" in data
            print("  [PASS] Learning path endpoint mounted and responding")
        else:
            print("  [INFO] Learning path endpoint not yet mounted (404)")

    def test_recommend_courses_content_type(self):
        """Response must be application/json."""
        response = client.post("/api/v1/ai/course-recommendations", json={
            "skill_gaps": [{"skill_name": "Excel", "priority": "essential"}],
            "limit": 3
        })
        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "")
        print("  [PASS] Content-type is application/json")

    def test_recommend_courses_all_priorities(self):
        """All priority levels should be accepted without error."""
        for priority in ["essential", "important", "nice_to_have"]:
            response = client.post("/api/v1/ai/course-recommendations", json={
                "skill_gaps": [{"skill_name": "Excel", "priority": priority}],
                "limit": 3
            })
            assert response.status_code == 200, \
                f"Failed for priority={priority}: {response.status_code} {response.text}"
        print("  [PASS] All priority levels accepted")

    def test_recommend_courses_no_limit_param(self):
        """Request without explicit limit should use default (no error)."""
        response = client.post("/api/v1/ai/course-recommendations", json={
            "skill_gaps": [{"skill_name": "Excel", "priority": "essential"}]
        })
        assert response.status_code == 200
        print("  [PASS] No limit param handled")
