#!/usr/bin/env python3
"""
Backend API Testing Script for Archery Target Scoring App
Focus: Session management APIs with target_type field testing
"""

import requests
import json
import uuid
from datetime import datetime
import sys
import os

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except:
        pass
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_BASE = f"{BASE_URL}/api"

print(f"Testing backend at: {API_BASE}")

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def test_pass(self, test_name):
        print(f"✅ {test_name}")
        self.passed += 1
    
    def test_fail(self, test_name, error):
        print(f"❌ {test_name}: {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n=== TEST SUMMARY ===")
        print(f"Total tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        if self.errors:
            print(f"\nErrors:")
            for error in self.errors:
                print(f"  - {error}")
        return self.failed == 0

results = TestResults()

def test_health_check():
    """Test health check endpoint"""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'healthy':
                results.test_pass("Health check endpoint")
                return True
            else:
                results.test_fail("Health check endpoint", f"Unexpected response: {data}")
        else:
            results.test_fail("Health check endpoint", f"Status code: {response.status_code}")
    except Exception as e:
        results.test_fail("Health check endpoint", str(e))
    return False

def test_create_session_with_target_type():
    """Test POST /api/sessions with target_type parameter"""
    test_cases = [
        {"target_type": "vegas_3spot", "name": "Vegas Test Session"},
        {"target_type": "nfaa_indoor", "name": "NFAA Test Session"},
        {"target_type": "wa_standard", "name": "WA Standard Test Session"}
    ]
    
    created_sessions = []
    
    for case in test_cases:
        try:
            response = requests.post(f"{API_BASE}/sessions", 
                                   json=case, 
                                   timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('target_type') == case['target_type']:
                    results.test_pass(f"Create session with target_type '{case['target_type']}'")
                    created_sessions.append(data['id'])
                else:
                    results.test_fail(f"Create session with target_type '{case['target_type']}'", 
                                    f"Expected target_type '{case['target_type']}', got '{data.get('target_type')}'")
            else:
                results.test_fail(f"Create session with target_type '{case['target_type']}'", 
                                f"Status code: {response.status_code}, Response: {response.text}")
        except Exception as e:
            results.test_fail(f"Create session with target_type '{case['target_type']}'", str(e))
    
    return created_sessions

def test_create_session_default_target_type():
    """Test POST /api/sessions without target_type (should default to wa_standard)"""
    try:
        payload = {"name": "Default Target Type Test Session"}
        response = requests.post(f"{API_BASE}/sessions", 
                               json=payload, 
                               timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('target_type') == 'wa_standard':
                results.test_pass("Create session with default target_type")
                return data['id']
            else:
                results.test_fail("Create session with default target_type", 
                                f"Expected default 'wa_standard', got '{data.get('target_type')}'")
        else:
            results.test_fail("Create session with default target_type", 
                            f"Status code: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.test_fail("Create session with default target_type", str(e))
    return None

def test_get_sessions_returns_target_type():
    """Test GET /api/sessions returns target_type field"""
    try:
        response = requests.get(f"{API_BASE}/sessions", timeout=10)
        
        if response.status_code == 200:
            sessions = response.json()
            if isinstance(sessions, list) and len(sessions) > 0:
                # Check if all sessions have target_type field
                all_have_target_type = True
                for session in sessions:
                    if 'target_type' not in session:
                        all_have_target_type = False
                        break
                
                if all_have_target_type:
                    results.test_pass("GET sessions returns target_type field")
                    return True
                else:
                    results.test_fail("GET sessions returns target_type field", 
                                    "Some sessions missing target_type field")
            else:
                results.test_pass("GET sessions returns target_type field (no sessions to check)")
                return True
        else:
            results.test_fail("GET sessions returns target_type field", 
                            f"Status code: {response.status_code}")
    except Exception as e:
        results.test_fail("GET sessions returns target_type field", str(e))
    return False

def test_update_session_target_type(session_id):
    """Test PUT /api/sessions/{session_id} can update target_type"""
    if not session_id:
        results.test_fail("Update session target_type", "No session ID provided")
        return False
    
    try:
        # Update target_type to a different value
        update_payload = {"target_type": "vegas_3spot"}
        response = requests.put(f"{API_BASE}/sessions/{session_id}", 
                              json=update_payload, 
                              timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('target_type') == 'vegas_3spot':
                results.test_pass("Update session target_type")
                return True
            else:
                results.test_fail("Update session target_type", 
                                f"Expected 'vegas_3spot', got '{data.get('target_type')}'")
        else:
            results.test_fail("Update session target_type", 
                            f"Status code: {response.status_code}, Response: {response.text}")
    except Exception as e:
        results.test_fail("Update session target_type", str(e))
    return False

def test_get_specific_session_target_type(session_id):
    """Test GET /api/sessions/{session_id} returns target_type"""
    if not session_id:
        results.test_fail("GET specific session target_type", "No session ID provided")
        return False
    
    try:
        response = requests.get(f"{API_BASE}/sessions/{session_id}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if 'target_type' in data:
                results.test_pass("GET specific session returns target_type")
                return True
            else:
                results.test_fail("GET specific session returns target_type", 
                                "target_type field missing")
        else:
            results.test_fail("GET specific session returns target_type", 
                            f"Status code: {response.status_code}")
    except Exception as e:
        results.test_fail("GET specific session returns target_type", str(e))
    return False

def cleanup_test_sessions(session_ids):
    """Clean up test sessions"""
    print("\n=== CLEANUP ===")
    for session_id in session_ids:
        try:
            response = requests.delete(f"{API_BASE}/sessions/{session_id}", timeout=10)
            if response.status_code == 200:
                print(f"✅ Cleaned up session {session_id}")
            else:
                print(f"⚠️  Failed to cleanup session {session_id}: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Error cleaning up session {session_id}: {e}")

def main():
    """Run all target_type related tests"""
    print("=== ARCHERY TARGET SCORING API TESTS ===")
    print("Focus: Session management APIs with target_type field")
    print(f"Backend URL: {API_BASE}")
    print()
    
    # Test health check first
    if not test_health_check():
        print("❌ Health check failed - backend may not be running")
        return False
    
    print("\n=== TARGET_TYPE FIELD TESTS ===")
    
    # Test creating sessions with different target types
    created_sessions = test_create_session_with_target_type()
    
    # Test default target_type
    default_session_id = test_create_session_default_target_type()
    if default_session_id:
        created_sessions.append(default_session_id)
    
    # Test GET sessions returns target_type
    test_get_sessions_returns_target_type()
    
    # Test updating target_type (use the default session if available)
    test_session_id = default_session_id if default_session_id else (created_sessions[0] if created_sessions else None)
    test_update_session_target_type(test_session_id)
    
    # Test GET specific session returns target_type
    test_get_specific_session_target_type(test_session_id)
    
    # Cleanup
    if created_sessions:
        cleanup_test_sessions(created_sessions)
    
    # Print summary
    success = results.summary()
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)