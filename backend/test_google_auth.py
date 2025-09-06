#!/usr/bin/env python
"""
Test script to verify Google OAuth authentication is working
"""
import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
import json

def test_google_auth():
    """Test the Google authentication endpoint"""
    client = Client()
    
    # Create a mock JWT token payload (base64 encoded)
    import base64
    
    mock_payload = {
        "email": "test@example.com",
        "name": "Test User",
        "sub": "1234567890"
    }
    
    # Create a simple mock JWT token (header.payload.signature)
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).decode().rstrip('=')
    payload = base64.urlsafe_b64encode(json.dumps(mock_payload).encode()).decode().rstrip('=')
    signature = base64.urlsafe_b64encode(b"fake_signature").decode().rstrip('=')
    
    mock_token = f"{header}.{payload}.{signature}"
    
    # Test the authentication endpoint
    response = client.post(
        '/api/auth/google/',
        data=json.dumps({'token': mock_token}),
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        print("✅ Google authentication endpoint is working!")
        
        # Check if user was created
        user = User.objects.filter(email="test@example.com").first()
        if user:
            print(f"✅ User created: {user.email} - {user.first_name} {user.last_name}")
        else:
            print("❌ User was not created")
    else:
        print("❌ Google authentication endpoint failed")

if __name__ == "__main__":
    print("Testing Google OAuth Authentication...")
    test_google_auth()
