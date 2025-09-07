#!/usr/bin/env python3
"""
Debug script to test resume upload functionality
"""
import os
import sys
import django
import requests
import json

# Add the project directory to Python path
sys.path.append('/'.join(os.path.abspath(__file__).split('/')[:-1]))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from candidates.models import Candidate

def test_resume_upload():
    """Test resume upload functionality"""
    
    # First, let's check if we have any candidates
    print("=== Checking existing candidates ===")
    candidates = Candidate.objects.all()
    print(f"Total candidates: {len(candidates)}")
    
    if len(candidates) == 0:
        print("No candidates found. Please create a candidate first.")
        return
    
    # Use the first candidate for testing
    candidate = candidates[0]
    print(f"Testing with candidate: {candidate.email} (ID: {candidate.candidate_id})")
    print(f"Has resume: {candidate.has_resume}")
    print(f"Resume filename: {candidate.resume_filename}")
    print(f"Resume size: {candidate.resume_size}")
    
    # Check if resume data exists
    if candidate.resume_data:
        print(f"Resume data length: {len(candidate.resume_data)} bytes")
    else:
        print("No resume data found")
    
    # Test the API endpoint
    print("\n=== Testing API endpoint ===")
    api_url = "http://localhost:8000/api/candidates/upload-resume/"
    
    # Check if we have a test PDF file
    test_pdf_path = None
    media_dir = "media/resumes"
    if os.path.exists(media_dir):
        pdf_files = [f for f in os.listdir(media_dir) if f.endswith('.pdf')]
        if pdf_files:
            test_pdf_path = os.path.join(media_dir, pdf_files[0])
            print(f"Using test PDF: {test_pdf_path}")
    
    if not test_pdf_path or not os.path.exists(test_pdf_path):
        print("No test PDF file found. Creating a dummy PDF...")
        # Create a minimal PDF for testing
        test_pdf_path = "test_resume.pdf"
        with open(test_pdf_path, 'wb') as f:
            # Minimal PDF content
            f.write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000125 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n173\n%%EOF")
    
    try:
        with open(test_pdf_path, 'rb') as pdf_file:
            files = {
                'resume': ('test_resume.pdf', pdf_file, 'application/pdf')
            }
            data = {
                'candidate_id': candidate.candidate_id
            }
            
            print(f"Sending POST request to: {api_url}")
            print(f"Data: {data}")
            print(f"Files: {list(files.keys())}")
            
            response = requests.post(api_url, data=data, files=files)
            
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            
            try:
                response_data = response.json()
                print(f"Response JSON: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Response text: {response.text}")
            
            # Check candidate after upload
            candidate.reload()
            print(f"\nAfter upload - Has resume: {candidate.has_resume}")
            print(f"After upload - Resume filename: {candidate.resume_filename}")
            print(f"After upload - Resume size: {candidate.resume_size}")
            
    except Exception as e:
        print(f"Error testing upload: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Clean up test file if we created it
    if test_pdf_path == "test_resume.pdf" and os.path.exists(test_pdf_path):
        os.remove(test_pdf_path)

if __name__ == "__main__":
    test_resume_upload()
