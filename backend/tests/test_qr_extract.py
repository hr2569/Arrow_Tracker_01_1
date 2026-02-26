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


class TestExtractQRWithValidPDF:
    """Test /api/extract-qr with actual PDF containing QR code"""
    
    def test_extract_qr_with_valid_pdf(self):
        """Extract QR from valid PDF should return session data"""
        import json
        import qrcode
        from io import BytesIO
        
        try:
            import fitz  # PyMuPDF
        except ImportError:
            pytest.skip("PyMuPDF not available for test PDF generation")
        
        # Create QR data
        qr_data = {
            "v": 1,
            "t": "arrow_tracker",
            "n": "Backend Test Archer",
            "s": 350,
            "b": "Compound",
            "d": "50m",
            "dt": "1/20/2026"
        }
        
        # Create QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(json.dumps(qr_data))
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        img_bytes = BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Create PDF with QR
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        img_rect = fitz.Rect(50, 50, 250, 250)
        page.insert_image(img_rect, stream=img_bytes.read())
        pdf_bytes = doc.tobytes()
        doc.close()
        
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        # Test endpoint
        response = requests.post(
            f"{BASE_URL}/api/extract-qr",
            json={"pdfs_base64": [pdf_base64]},
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("total_qr_found") == 1
        assert len(data.get("sessions", [])) == 1
        
        session = data["sessions"][0]
        assert session["name"] == "Backend Test Archer"
        assert session["score"] == 350
        assert session["bowType"] == "Compound"
        assert session["distance"] == "50m"


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
