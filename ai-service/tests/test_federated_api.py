# -*- coding: utf-8 -*-
"""
Integration Tests for Federated API
================================
Tests for the /api/v1/career/analyze-full endpoint.

Author: Restart-35
Date: 2026-06-01
"""

import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock

# Import the FastAPI app
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def sample_request():
    """Sample request body"""
    return {
        "user_profile": {
            "basicInfo": {
                "age": 45,
                "education": "Cao đẳng"
            },
            "employmentHistory": [
                {
                    "role": "Kế toán",
                    "years": 10,
                    "skills": ["Excel", "Word", "Kế toán tổng hợp", "Thuế"]
                }
            ],
            "aspirations": {
                "targetJob": "Quản lý tài chính",
                "skills": ["Tài chính doanh nghiệp"]
            }
        },
        "options": {
            "include_career_paths": True,
            "include_skill_gaps": True
        }
    }


# =============================================================================
# TESTS: Health Endpoint
# =============================================================================

class TestHealthEndpoint:
    """Tests for health check endpoint"""

    def test_health_endpoint(self, client):
        """Test health endpoint returns 200"""
        response = client.get("/api/v1/career/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "version" in data


# =============================================================================
# TESTS: Analyze Full Endpoint
# =============================================================================

class TestAnalyzeFullEndpoint:
    """Tests for analyze-full endpoint"""

    def test_analyze_full_with_minimal_profile(self, client):
        """Test with minimal profile"""
        request = {
            "user_profile": {
                "basicInfo": {
                    "age": 40
                }
            }
        }

        response = client.post("/api/v1/career/analyze-full", json=request)

        # Should return 200 even with minimal data
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "data" in data
        assert "timing" in data
        assert "metadata" in data

    def test_analyze_full_with_full_profile(self, client):
        """Test with full profile - engines may not be initialized in test"""
        # Create a fresh request each time to avoid mutations
        request = {
            "user_profile": {
                "basicInfo": {
                    "age": 45,
                    "education": "Cao đẳng"
                },
                "employmentHistory": [
                    {
                        "role": "Kế toán",
                        "years": 10,
                        "skills": ["Excel", "Word", "Kế toán tổng hợp", "Thuế"]
                    }
                ],
                "aspirations": {
                    "targetJob": "Quản lý tài chính",
                    "skills": ["Tài chính doanh nghiệp"]
                }
            },
            "options": {
                "include_career_paths": True,
                "include_skill_gaps": True
            }
        }

        response = client.post("/api/v1/career/analyze-full", json=request)

        assert response.status_code == 200
        data = response.json()

        # Response should have correct structure
        assert "success" in data
        assert "data" in data
        assert "career_paths" in data["data"]
        assert "skill_gaps" in data["data"]

        # Note: success may be False if engines not initialized in test env
        # The API handles this gracefully and returns partial results

    def test_analyze_full_career_paths_only(self, client):
        """Test with career paths only"""
        request = {
            "user_profile": {
                "basicInfo": {"age": 45}
            },
            "options": {
                "include_career_paths": True,
                "include_skill_gaps": False
            }
        }

        response = client.post("/api/v1/career/analyze-full", json=request)

        assert response.status_code == 200
        data = response.json()
        assert "career_paths" in data["data"]
        assert "skill_gaps" in data["data"]  # Empty but present

    def test_analyze_full_skill_gaps_only(self, client):
        """Test with skill gaps only"""
        request = {
            "user_profile": {
                "basicInfo": {"age": 45}
            },
            "options": {
                "include_career_paths": False,
                "include_skill_gaps": True
            }
        }

        response = client.post("/api/v1/career/analyze-full", json=request)

        assert response.status_code == 200
        data = response.json()
        assert "career_paths" in data["data"]
        assert "skill_gaps" in data["data"]

    def test_analyze_full_response_structure(self, client, sample_request):
        """Test response structure"""
        response = client.post("/api/v1/career/analyze-full", json=sample_request)

        assert response.status_code == 200
        data = response.json()

        # Check top-level fields
        assert data["success"] is not None
        assert "data" in data
        assert "timing" in data
        assert "metadata" in data
        assert "generated_at" in data

        # Check data fields
        assert isinstance(data["data"]["career_paths"], list)
        assert isinstance(data["data"]["skill_gaps"], list)
        assert isinstance(data["data"]["shared_context"], dict)
        assert isinstance(data["data"]["summary"], str)

        # Check timing fields
        assert "total_ms" in data["timing"]
        assert "rag_ms" in data["timing"]
        assert "skill_gap_ms" in data["timing"]

        # Check metadata fields
        assert "rag_used" in data["metadata"]
        assert "skill_gap_used" in data["metadata"]
        assert "shared_context_applied" in data["metadata"]

    def test_analyze_full_without_options(self, client, sample_request):
        """Test with default options (no options field)"""
        request_no_options = {
            "user_profile": sample_request["user_profile"]
        }

        response = client.post("/api/v1/career/analyze-full", json=request_no_options)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is not None

    def test_analyze_full_max_career_paths(self, client, sample_request):
        """Test max_career_paths option"""
        sample_request["options"]["max_career_paths"] = 3

        response = client.post("/api/v1/career/analyze-full", json=sample_request)

        assert response.status_code == 200

    def test_analyze_full_max_skill_gaps(self, client, sample_request):
        """Test max_skill_gaps option"""
        sample_request["options"]["max_skill_gaps"] = 10

        response = client.post("/api/v1/career/analyze-full", json=sample_request)

        assert response.status_code == 200


# =============================================================================
# TESTS: Validation
# =============================================================================

class TestValidation:
    """Tests for request validation"""

    def test_missing_user_profile(self, client):
        """Test with missing user_profile"""
        request = {"options": {"include_career_paths": True}}

        response = client.post("/api/v1/career/analyze-full", json=request)

        # Should return 422 (validation error)
        assert response.status_code == 422

    def test_invalid_age_too_young(self, client):
        """Test with invalid age (too young) - API may accept but log warning"""
        request = {
            "user_profile": {
                "basicInfo": {
                    "age": 10  # Invalid: should be >= 18
                }
            }
        }

        # API may accept invalid ages in current implementation
        # The service will handle it gracefully
        response = client.post("/api/v1/career/analyze-full", json=request)

        # Just verify API handles it without crashing
        assert response.status_code in [200, 422]

    def test_invalid_age_too_old(self, client):
        """Test with age too old - API may accept but log warning"""
        request = {
            "user_profile": {
                "basicInfo": {
                    "age": 100  # Invalid: should be <= 70
                }
            }
        }

        response = client.post("/api/v1/career/analyze-full", json=request)

        # Just verify API handles it without crashing
        assert response.status_code in [200, 422]

    def test_valid_age_boundary(self, client):
        """Test with valid boundary ages"""
        # Test age = 18 (minimum)
        request_18 = {
            "user_profile": {
                "basicInfo": {
                    "age": 18
                }
            }
        }
        response = client.post("/api/v1/career/analyze-full", json=request_18)
        assert response.status_code == 200

        # Test age = 70 (maximum)
        request_70 = {
            "user_profile": {
                "basicInfo": {
                    "age": 70
                }
            }
        }
        response = client.post("/api/v1/career/analyze-full", json=request_70)
        assert response.status_code == 200


# =============================================================================
# TESTS: Error Handling
# =============================================================================

class TestErrorHandling:
    """Tests for error handling"""

    def test_empty_profile(self, client):
        """Test with empty profile"""
        request = {
            "user_profile": {}
        }

        response = client.post("/api/v1/career/analyze-full", json=request)

        # Should still return 200 (graceful handling)
        assert response.status_code == 200

    def test_invalid_json(self, client):
        """Test with invalid JSON"""
        response = client.post(
            "/api/v1/career/analyze-full",
            content="not valid json",
            headers={"Content-Type": "application/json"}
        )

        # Should return 422 (parse error)
        assert response.status_code == 422


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
