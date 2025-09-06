#!/usr/bin/env python
"""
Test script to verify API endpoints are working
"""
import requests
import os

def test_api_endpoints():
    print("🧪 Testing API Endpoints")
    print("=" * 40)
    
    base_url = "http://localhost:8000/api"
    
    # Test 1: Check if server is running
    print("1. Testing server connectivity...")
    try:
        response = requests.get(f"{base_url}/candidates/", timeout=5)
        print(f"✅ Server is running (Status: {response.status_code})")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running or not accessible")
        return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False
    
    # Test 2: Create a test candidate (you'll need authentication for this)
    print("\n2. Testing candidate creation...")
    # This will likely fail without authentication, but let's see the error
    try:
        candidate_data = {"email": "test_api@example.com"}
        response = requests.post(f"{base_url}/candidates/", json=candidate_data)
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Test upload endpoint accessibility
    print("\n3. Testing upload endpoint accessibility...")
    try:
        # Just test if the endpoint exists
        response = requests.post(f"{base_url}/candidates/upload-resume/", 
                               data={"candidate_id": "test"})
        print(f"Upload endpoint status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"Error: {e}")
    
    return True

if __name__ == "__main__":
    test_api_endpoints()
