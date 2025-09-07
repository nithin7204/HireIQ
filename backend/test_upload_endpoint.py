import requests
import os

# Test the upload endpoint
def test_upload_endpoint():
    # First, let's test if we can get candidates (to verify API is working)
    try:
        response = requests.get('http://localhost:8000/api/candidates/')
        print(f"Candidates endpoint status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"Error accessing candidates endpoint: {e}")
    
    # Test upload endpoint with minimal data
    try:
        # Create a simple test file
        test_content = b"Test PDF content"
        files = {'resume': ('test.pdf', test_content, 'application/pdf')}
        data = {'candidate_id': 'test-id'}
        
        response = requests.post(
            'http://localhost:8000/api/candidates/upload-resume/',
            files=files,
            data=data
        )
        
        print(f"Upload endpoint status: {response.status_code}")
        print(f"Upload response: {response.text}")
        
    except Exception as e:
        print(f"Error testing upload endpoint: {e}")

if __name__ == "__main__":
    test_upload_endpoint()
