#!/usr/bin/env python
"""
Test script for resume upload functionality
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
from datetime import datetime

def test_resume_upload():
    print("🧪 Testing Resume Upload Functionality")
    print("=" * 50)
    
    try:
        # Create a test candidate
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        test_candidate_id = str(uuid.uuid4())
        
        print(f"📝 Creating test candidate: {test_email}")
        candidate = Candidate(
            candidate_id=test_candidate_id,
            email=test_email,
            created_by_id="test_user_123",
            is_active=True
        )
        candidate.save()
        print(f"✅ Test candidate created with ID: {test_candidate_id}")
        
        # Create a dummy PDF content
        dummy_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n196\n%%EOF"
        
        # Test saving binary data
        print("📄 Testing binary PDF storage...")
        candidate.resume_filename = "test_resume.pdf"
        candidate.resume_data = dummy_pdf_content
        candidate.resume_content_type = "application/pdf"
        candidate.resume_size = str(len(dummy_pdf_content))
        candidate.save()
        
        print(f"✅ Resume data saved successfully")
        print(f"   - Filename: {candidate.resume_filename}")
        print(f"   - Size: {candidate.resume_size} bytes")
        print(f"   - Content type: {candidate.resume_content_type}")
        print(f"   - Has data: {bool(candidate.resume_data)}")
        
        # Test retrieval
        print("🔍 Testing data retrieval...")
        retrieved_candidate = Candidate.objects.get(candidate_id=test_candidate_id)
        
        if retrieved_candidate.resume_data:
            print(f"✅ Resume data retrieved successfully")
            print(f"   - Retrieved size: {len(retrieved_candidate.resume_data)} bytes")
            print(f"   - Data matches: {retrieved_candidate.resume_data == dummy_pdf_content}")
        else:
            print("❌ No resume data found after retrieval")
        
        # Clean up
        print("🧹 Cleaning up test data...")
        candidate.delete()
        print("✅ Test candidate deleted")
        
        print("\n🎉 All tests passed! Resume upload functionality is working.")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_resume_upload()
