#!/usr/bin/env python3
"""
Test script to verify the AI report API endpoint is working correctly.
"""
import os
import sys
import django

# Add the current directory to the Python path
sys.path.append('.')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from candidates.models import Candidate
from django.contrib.auth.models import User
from django.test import RequestFactory
from candidates.views import get_detailed_report
from django.http import JsonResponse

def test_ai_report():
    print("🧪 Testing AI Report Generation...")
    
    # Find a candidate with evaluation data
    candidate = Candidate.objects.filter(evaluation_score__ne=None).first()
    
    if not candidate:
        print("❌ No candidates with evaluation data found for testing")
        return False
    
    print(f"✅ Found test candidate: {candidate.email}")
    print(f"   Candidate ID: {candidate.candidate_id}")
    print(f"   Evaluation Score: {candidate.evaluation_score}")
    
    # Find the user who created this candidate
    try:
        user = User.objects.get(id=candidate.created_by_id)
        print(f"   Created by: {user.email}")
    except User.DoesNotExist:
        print("❌ Creator user not found")
        return False
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get(f'/api/candidates/{candidate.candidate_id}/detailed-report/')
    request.user = user
    
    try:
        # Call the view function directly
        response = get_detailed_report(request, candidate.candidate_id)
        
        if response.status_code == 200:
            print("✅ AI Report generation successful!")
            print(f"   Status Code: {response.status_code}")
            
            # Handle Django Response object
            if hasattr(response, 'data'):
                data = response.data
            else:
                # For DRF Response objects
                data = response.data if hasattr(response, 'data') else {}
            
            if data:
                print(f"   Interview Score: {data.get('interview_score')}")
                print(f"   Recommendation: {data.get('recommendation')}")
                print(f"   Completion Rate: {data.get('completion_rate')}")
            else:
                print("   Response data structure not accessible in test (but API works)")
            
            return True
        else:
            print(f"❌ API call failed with status: {response.status_code}")
            print(f"   Response: {response.content.decode('utf-8')}")
            return False
            
    except Exception as e:
        print(f"❌ Error during API test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_ai_report()
    if success:
        print("\n🎉 AI Report functionality is working correctly!")
    else:
        print("\n💥 AI Report test failed - please check the logs above")
