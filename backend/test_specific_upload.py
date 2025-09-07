import requests
import os

def test_specific_candidate_upload():
    candidate_id = "93952e19-adec-4c2c-8659-e67b1083843a"
    
    # First verify the candidate exists
    try:
        response = requests.post(
            'http://localhost:8000/api/candidates/validate/',
            json={'candidate_id': candidate_id}
        )
        print(f"Candidate validation status: {response.status_code}")
        print(f"Validation response: {response.text}")
    except Exception as e:
        print(f"Error validating candidate: {e}")
    
    # Test upload with this specific candidate
    try:
        # Create a test PDF file
        test_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n175\n%%EOF"
        
        files = {'resume': ('test-resume.pdf', test_content, 'application/pdf')}
        data = {'candidate_id': candidate_id}
        
        response = requests.post(
            'http://localhost:8000/api/candidates/upload-resume/',
            files=files,
            data=data
        )
        
        print(f"Upload status: {response.status_code}")
        print(f"Upload response: {response.text}")
        
    except Exception as e:
        print(f"Error testing upload: {e}")

if __name__ == "__main__":
    test_specific_candidate_upload()
