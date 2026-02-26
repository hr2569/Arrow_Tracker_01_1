"""
Backend tests for Arrow Tracker QR Code extraction feature
Tests the /api/extract-qr and /api/health endpoints
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://score-keeper-24.preview.emergentagent.com')


class TestHealthEndpoint:
    """Test /api/health endpoint"""
    
    def test_health_returns_healthy(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"


class TestExtractQREndpoint:
    """Test /api/extract-qr endpoint for QR code extraction from PDFs"""
    
    def test_extract_qr_empty_pdf_list(self):
        """Extract QR with empty PDF list should return success with no sessions"""
        response = requests.post(
            f"{BASE_URL}/api/extract-qr",
            json={"pdfs_base64": []},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("sessions") == []
        assert data.get("total_qr_found") == 0
        assert data.get("error") == ""
    
    def test_extract_qr_invalid_base64(self):
        """Extract QR with invalid base64 should handle gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/extract-qr",
            json={"pdfs_base64": ["not-valid-base64!!"]},
            headers={"Content-Type": "application/json"}
        )
        # Should not crash - will return success with 0 QR codes found
        assert response.status_code == 200
        data = response.json()
        # The endpoint handles errors gracefully and continues processing
        assert "success" in data
    
    def test_extract_qr_response_structure(self):
        """Verify response structure matches QRExtractResponse model"""
        response = requests.post(
            f"{BASE_URL}/api/extract-qr",
            json={"pdfs_base64": []},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields are present
        assert "success" in data
        assert "sessions" in data
        assert "total_qr_found" in data
        assert "error" in data
        
        # Check types
        assert isinstance(data["success"], bool)
        assert isinstance(data["sessions"], list)
        assert isinstance(data["total_qr_found"], int)
        assert isinstance(data["error"], str)
    
    def test_extract_qr_missing_field(self):
        """Extract QR with missing pdfs_base64 field should return 422"""
        response = requests.post(
            f"{BASE_URL}/api/extract-qr",
            json={},
            headers={"Content-Type": "application/json"}
        )
        # FastAPI validation should return 422 for missing required field
        assert response.status_code == 422


class TestRootEndpoint:
    """Test root API endpoint"""
    
    def test_root_returns_message(self):
        """Root endpoint should return API message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Archery Target Scoring API" in data["message"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
