#!/usr/bin/env python
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('c:/files/HireIQ/backend')

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

try:
    print("Testing import of questions module...")
    from candidates.ml_models.questions import get_questions
    print("✓ Successfully imported get_questions function")
    
    print("\nTesting environment variables...")
    if os.getenv("GROQ_API_KEY"):
        print("✓ GROQ_API_KEY found")
    else:
        print("✗ GROQ_API_KEY not found")
        
    if os.getenv("PERPLEXITY_API_KEY"):
        print("✓ PERPLEXITY_API_KEY found")
    else:
        print("✗ PERPLEXITY_API_KEY not found")
    
    print("\nTesting PDF file access...")
    pdf_path = "c:/files/HireIQ/backend/media/resumes/eddb70fe-dc01-42a0-8e47-654cc1cdeca8_eeadafcc-5563-4ca3-b458-d408f67dd476.pdf"
    if os.path.exists(pdf_path):
        print(f"✓ PDF file exists: {pdf_path}")
        with open(pdf_path, 'rb') as f:
            print(f"✓ PDF file can be opened, size: {len(f.read())} bytes")
    else:
        print(f"✗ PDF file not found: {pdf_path}")
    
    print("\nTesting individual function imports...")
    from candidates.ml_models.questions import parse_resume
    print("✓ parse_resume imported")
    
    from candidates.ml_models.questions import build_retriever
    print("✓ build_retriever imported")
    
    from candidates.ml_models.questions import get_interview_topics
    print("✓ get_interview_topics imported")
    
    from candidates.ml_models.questions import merge_hr_with_hot_topics
    print("✓ merge_hr_with_hot_topics imported")
    
    from candidates.ml_models.questions import generate_questions
    print("✓ generate_questions imported")
    
    print("\nAll imports successful!")
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
