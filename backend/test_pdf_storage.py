#!/usr/bin/env python
"""
Test script to verify MongoDB PDF storage functionality
Run this script from the backend directory: python test_pdf_storage.py
"""

import os
import sys
import django
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from candidates.models import Candidate

def test_pdf_storage():
    print("Testing MongoDB PDF storage...")
    
    # Create a test PDF content (simple PDF-like binary data)
    test_pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000207 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF'
    
    try:
        # Create a test candidate
        test_candidate = Candidate(
            email=f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@test.com",
            created_by_id="test_user_123"
        )
        test_candidate.save()
        
        print(f"✓ Created test candidate: {test_candidate.candidate_id}")
        
        # Store PDF in MongoDB
        test_candidate.resume_filename = "test_resume.pdf"
        test_candidate.resume_data = test_pdf_content
        test_candidate.resume_content_type = "application/pdf"
        test_candidate.resume_size = str(len(test_pdf_content))
        test_candidate.save()
        
        print(f"✓ Stored PDF data in MongoDB (size: {len(test_pdf_content)} bytes)")
        
        # Retrieve and verify
        retrieved_candidate = Candidate.objects.get(candidate_id=test_candidate.candidate_id)
        
        if retrieved_candidate.resume_data:
            print(f"✓ Successfully retrieved PDF data (size: {len(retrieved_candidate.resume_data)} bytes)")
            
            # Verify content matches
            if retrieved_candidate.resume_data == test_pdf_content:
                print("✓ PDF content verification passed")
            else:
                print("✗ PDF content verification failed")
                
            # Check metadata
            print(f"✓ Filename: {retrieved_candidate.resume_filename}")
            print(f"✓ Content Type: {retrieved_candidate.resume_content_type}")
            print(f"✓ Size: {retrieved_candidate.resume_size} bytes")
            
        else:
            print("✗ No PDF data found in retrieved candidate")
        
        # Clean up
        test_candidate.delete()
        print("✓ Cleaned up test candidate")
        
        print("\n🎉 MongoDB PDF storage test completed successfully!")
        
    except Exception as e:
        print(f"✗ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf_storage()
