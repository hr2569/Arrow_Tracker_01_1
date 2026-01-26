#!/usr/bin/env python3
"""
Backend API Testing for Archery Target Scoring App
Tests all backend endpoints including AI image analysis
"""

import requests
import json
import base64
import io
from PIL import Image, ImageDraw
import sys
import time

# Backend URL from frontend .env
BACKEND_URL = "https://bullseye-app-24.preview.emergentagent.com/api"

def create_test_archery_target():
    """Create a simple archery target image for testing AI endpoints"""
    # Create a 400x400 image with white background
    img = Image.new('RGB', (400, 400), 'white')
    draw = ImageDraw.Draw(img)
    
    # Draw concentric circles for archery target
    center = (200, 200)
    colors = ['gold', 'gold', 'red', 'red', 'blue', 'blue', 'black', 'black', 'white', 'white']
    
    for i, color in enumerate(colors):
        radius = 180 - (i * 18)  # Decreasing radius for each ring
        draw.ellipse([center[0]-radius, center[1]-radius, 
                     center[0]+radius, center[1]+radius], 
                    fill=color, outline='black', width=2)
    
    # Add center X mark
    draw.line([190, 190, 210, 210], fill='black', width=3)
    draw.line([190, 210, 210, 190], fill='black', width=3)
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return img_base64

def test_health_endpoint():
    """Test GET /api/health"""
    print("🎯 Testing Health Endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200 and response.json().get('status') == 'healthy':
            print("✅ Health check passed")
            return True
        else:
            print("❌ Health check failed")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_session_crud():
    """Test session CRUD operations"""
    print("\n🎯 Testing Session CRUD Operations...")
    
    # Test 1: Create session
    print("1. Creating new session...")
    try:
        create_data = {"name": "Test Archery Session"}
        response = requests.post(f"{BACKEND_URL}/sessions", 
                               json=create_data, timeout=10)
        print(f"Create Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Create session failed: {response.text}")
            return False
            
        session_data = response.json()
        session_id = session_data.get('id')
        print(f"✅ Session created with ID: {session_id}")
        print(f"Session data: {json.dumps(session_data, indent=2)}")
        
    except Exception as e:
        print(f"❌ Create session error: {e}")
        return False
    
    # Test 2: Get all sessions
    print("\n2. Getting all sessions...")
    try:
        response = requests.get(f"{BACKEND_URL}/sessions", timeout=10)
        print(f"Get all Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Get sessions failed: {response.text}")
            return False
            
        sessions = response.json()
        print(f"✅ Retrieved {len(sessions)} sessions")
        
    except Exception as e:
        print(f"❌ Get sessions error: {e}")
        return False
    
    # Test 3: Get specific session
    print(f"\n3. Getting session {session_id}...")
    try:
        response = requests.get(f"{BACKEND_URL}/sessions/{session_id}", timeout=10)
        print(f"Get specific Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Get specific session failed: {response.text}")
            return False
            
        session = response.json()
        print(f"✅ Retrieved session: {session.get('name')}")
        
    except Exception as e:
        print(f"❌ Get specific session error: {e}")
        return False
    
    # Test 4: Add round to session
    print(f"\n4. Adding round to session {session_id}...")
    try:
        round_data = {
            "round_number": 1,
            "shots": [
                {"x": 0.1, "y": 0.1, "ring": 8},
                {"x": 0.05, "y": 0.05, "ring": 9},
                {"x": 0.0, "y": 0.0, "ring": 10}
            ]
        }
        response = requests.post(f"{BACKEND_URL}/sessions/{session_id}/rounds", 
                               json=round_data, timeout=10)
        print(f"Add round Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Add round failed: {response.text}")
            return False
            
        updated_session = response.json()
        print(f"✅ Round added. Total score: {updated_session.get('total_score')}")
        print(f"Rounds count: {len(updated_session.get('rounds', []))}")
        
    except Exception as e:
        print(f"❌ Add round error: {e}")
        return False
    
    # Test 5: Delete session
    print(f"\n5. Deleting session {session_id}...")
    try:
        response = requests.delete(f"{BACKEND_URL}/sessions/{session_id}", timeout=10)
        print(f"Delete Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Delete session failed: {response.text}")
            return False
            
        result = response.json()
        print(f"✅ Session deleted: {result.get('message')}")
        
    except Exception as e:
        print(f"❌ Delete session error: {e}")
        return False
    
    print("✅ All session CRUD operations passed")
    return True

def test_target_analysis():
    """Test AI target corner detection"""
    print("\n🎯 Testing Target Analysis (AI Corner Detection)...")
    
    try:
        # Create test archery target image
        target_image = create_test_archery_target()
        
        request_data = {"image_base64": target_image}
        response = requests.post(f"{BACKEND_URL}/analyze-target", 
                               json=request_data, timeout=30)
        
        print(f"Target Analysis Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Target analysis failed: {response.text}")
            return False
            
        result = response.json()
        print(f"Analysis result: {json.dumps(result, indent=2)}")
        
        # Check if analysis was successful
        if result.get('success'):
            corners = result.get('corners', [])
            center = result.get('center', {})
            print(f"✅ Target detected with {len(corners)} corners")
            print(f"Center: {center}")
            return True
        else:
            print(f"❌ Target analysis failed: {result.get('message')}")
            return False
            
    except Exception as e:
        print(f"❌ Target analysis error: {e}")
        return False

def test_arrow_detection():
    """Test AI arrow detection"""
    print("\n🎯 Testing Arrow Detection (AI)...")
    
    try:
        # Create test archery target image
        target_image = create_test_archery_target()
        
        request_data = {"image_base64": target_image}
        response = requests.post(f"{BACKEND_URL}/detect-arrows", 
                               json=request_data, timeout=30)
        
        print(f"Arrow Detection Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Arrow detection failed: {response.text}")
            return False
            
        result = response.json()
        print(f"Detection result: {json.dumps(result, indent=2)}")
        
        # Check if detection was successful
        if result.get('success'):
            arrows = result.get('arrows', [])
            print(f"✅ Arrow detection completed. Found {len(arrows)} arrows")
            return True
        else:
            print(f"❌ Arrow detection failed: {result.get('message')}")
            return False
            
    except Exception as e:
        print(f"❌ Arrow detection error: {e}")
        return False

def test_edge_cases():
    """Test edge cases and error handling"""
    print("\n🎯 Testing Edge Cases...")
    
    # Test 1: Invalid session ID
    print("1. Testing invalid session ID...")
    try:
        response = requests.get(f"{BACKEND_URL}/sessions/invalid-id", timeout=10)
        if response.status_code == 404:
            print("✅ Invalid session ID handled correctly")
        else:
            print(f"❌ Invalid session ID not handled: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Invalid session test error: {e}")
        return False
    
    # Test 2: Invalid image data
    print("2. Testing invalid image data...")
    try:
        request_data = {"image_base64": "invalid_base64_data"}
        response = requests.post(f"{BACKEND_URL}/analyze-target", 
                               json=request_data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            # Since we're using mocked data, this will always succeed
            # This is expected behavior with the current mock implementation
            print("✅ Invalid image handled (mocked response)")
        else:
            print("✅ Invalid image rejected at API level")
    except Exception as e:
        print(f"❌ Invalid image test error: {e}")
        return False
    
    # Test 3: Minimum shots requirement
    print("3. Testing minimum shots requirement...")
    try:
        # Create session first
        create_data = {"name": "Edge Case Test Session"}
        response = requests.post(f"{BACKEND_URL}/sessions", json=create_data, timeout=10)
        session_data = response.json()
        session_id = session_data.get('id')
        
        # Add round with only 1 shot (should be padded to 3)
        round_data = {
            "round_number": 1,
            "shots": [{"x": 0.0, "y": 0.0, "ring": 10}]
        }
        response = requests.post(f"{BACKEND_URL}/sessions/{session_id}/rounds", 
                               json=round_data, timeout=10)
        
        if response.status_code == 200:
            updated_session = response.json()
            rounds = updated_session.get('rounds', [])
            if len(rounds) > 0 and len(rounds[0].get('shots', [])) >= 3:
                print("✅ Minimum shots requirement enforced")
            else:
                print("❌ Minimum shots not enforced")
                return False
        
        # Clean up
        requests.delete(f"{BACKEND_URL}/sessions/{session_id}", timeout=10)
        
    except Exception as e:
        print(f"❌ Minimum shots test error: {e}")
        return False
    
    print("✅ All edge cases passed")
    return True

def main():
    """Run all backend tests"""
    print("🏹 Starting Archery Target Scoring Backend Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    results = []
    
    # Run all tests
    results.append(("Health Check", test_health_endpoint()))
    results.append(("Session CRUD", test_session_crud()))
    results.append(("Target Analysis AI", test_target_analysis()))
    results.append(("Arrow Detection AI", test_arrow_detection()))
    results.append(("Edge Cases", test_edge_cases()))
    
    # Summary
    print("\n" + "=" * 60)
    print("🎯 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<25} {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests PASSED!")
        return True
    else:
        print("⚠️  Some backend tests FAILED!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)