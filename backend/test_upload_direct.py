#!/usr/bin/env python
"""
Test the upload API endpoint directly with a sample PDF
"""
import requests
import io

def test_upload_api():
    print("🧪 Testing Upload API Directly")
    print("=" * 40)
    
    # Create a simple PDF content
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
196
%%EOF"""
    
    # Create file-like object
    pdf_file = io.BytesIO(pdf_content)
    
    url = "http://localhost:8000/api/candidates/upload-resume/"
    
    # Prepare form data
    files = {
        'resume': ('test_resume.pdf', pdf_file, 'application/pdf')
    }
    data = {
        'candidate_id': 'test123'
    }
    
    try:
        print(f"📤 Sending upload request to: {url}")
        print(f"📁 File size: {len(pdf_content)} bytes")
        print(f"🆔 Candidate ID: test123")
        
        response = requests.post(url, files=files, data=data)
        
        print(f"\n📊 Response Status: {response.status_code}")
        print(f"📄 Response Content: {response.text}")
        
        if response.status_code == 200:
            print("✅ Upload successful!")
        else:
            print(f"❌ Upload failed with status {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the server. Make sure Django is running on localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_upload_api()
