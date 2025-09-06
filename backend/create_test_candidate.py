#!/usr/bin/env python
"""
Create a test candidate for frontend testing
"""
import os
import sys
import django
from django.conf import settings

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from candidates.models import Candidate
import uuid

def create_test_candidate():
    print("🧪 Creating Test Candidate for Frontend Testing")
    print("=" * 50)
    
    try:
        # Create a test candidate with a simple ID
        test_email = "frontend.test@example.com"
        test_candidate_id = "test123"  # Simple ID for easy testing
        
        # Check if candidate already exists
        try:
            existing = Candidate.objects.get(candidate_id=test_candidate_id)
            print(f"🔄 Test candidate already exists: {test_candidate_id}")
            print(f"   Email: {existing.email}")
            print(f"   Has resume: {bool(existing.resume_data)}")
            return test_candidate_id
        except Candidate.DoesNotExist:
            pass
        
        # Create new candidate
        candidate = Candidate(
            candidate_id=test_candidate_id,
            email=test_email,
            created_by_id="test_user_frontend",
            is_active=True
        )
        candidate.save()
        
        print(f"✅ Test candidate created successfully!")
        print(f"   Candidate ID: {test_candidate_id}")
        print(f"   Email: {test_email}")
        print(f"   You can now use this ID to test the frontend upload")
        
        return test_candidate_id
        
    except Exception as e:
        print(f"❌ Failed to create test candidate: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    candidate_id = create_test_candidate()
    if candidate_id:
        print(f"\n🎯 Use this Candidate ID in the frontend: {candidate_id}")
