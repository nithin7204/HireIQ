#!/usr/bin/env python3
"""
Test script to demonstrate the evaluation workflow for the recruiter dashboard.
This script simulates a candidate completing an interview and shows how the evaluation scores appear.
"""

import json
import requests
import sys
import os

# Configuration
BACKEND_URL = "http://localhost:8000"
API_BASE = "/api/candidates"

def test_fetch_evaluation(candidate_id):
    """Test the fetch evaluation endpoint."""
    print(f"🧪 Testing evaluation fetch for candidate: {candidate_id}")
    
    try:
        # Send POST request to fetch evaluation
        response = requests.post(
            f"{BACKEND_URL}{API_BASE}/fetch-evaluation/",
            json={'candidate_id': candidate_id},
            headers={'Content-Type': 'application/json'},
            timeout=60
        )
        
        print(f"Response Status Code: {response.status_code}")
        
        # Parse response
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            print("Error: Response is not valid JSON")
            print(f"Response text: {response.text}")
            return False
        
        # Handle different response scenarios
        if response.status_code == 200:
            print("✅ Evaluation fetch successful!")
            
            # Display summary
            if 'evaluation_summary' in response_data:
                summary = response_data['evaluation_summary']
                print(f"\n📊 EVALUATION SUMMARY:")
                print(f"   Average Score: {summary.get('average_score', 'N/A')}/10")
                print(f"   Overall Rating: {summary.get('overall_rating', 'N/A')}")
                print(f"   Total Questions: {summary.get('total_questions', 'N/A')}")
                print(f"   Successful Evaluations: {summary.get('successful_evaluations', 'N/A')}")
            
            # Display candidate data
            if 'candidate' in response_data:
                candidate = response_data['candidate']
                print(f"\n👤 CANDIDATE DATA:")
                print(f"   Email: {candidate.get('email', 'N/A')}")
                print(f"   Interview Score: {candidate.get('interview_score', 'N/A')}")
                print(f"   Evaluation Rating: {candidate.get('evaluation_rating', 'N/A')}")
                print(f"   Has Resume: {candidate.get('has_resume', 'N/A')}")
                print(f"   Has Questions: {candidate.get('has_questions', 'N/A')}")
            
            return True
            
        elif response.status_code == 404:
            error_msg = response_data.get('error', 'Unknown error')
            print(f"❌ Error 404: {error_msg}")
            
            if 'Invalid candidate ID' in error_msg:
                print("Make sure the candidate ID exists")
            elif 'Resume not found' in error_msg:
                print("Make sure the candidate has uploaded a resume")
            elif 'No interview responses' in error_msg:
                print("Make sure the candidate has completed the interview")
            
            return False
            
        elif response.status_code == 400:
            print("❌ Error: Bad request")
            if 'error' in response_data:
                print(f"Details: {response_data['error']}")
            return False
            
        else:
            print(f"❌ Error: Unexpected status code {response.status_code}")
            if 'error' in response_data:
                print(f"Details: {response_data['error']}")
            return False
    
    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Could not connect to backend at {BACKEND_URL}")
        print("Make sure the Django backend is running")
        return False
    except requests.exceptions.Timeout:
        print("❌ Error: Request timed out")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_candidate_list():
    """Test the candidate list endpoint to see evaluation scores."""
    print(f"📋 Testing candidate list to check evaluation scores...")
    
    try:
        # This would normally require authentication, but we'll try anyway
        response = requests.get(
            f"{BACKEND_URL}{API_BASE}/",
            timeout=30
        )
        
        print(f"Response Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("⚠️  Authentication required for candidate list")
            print("This endpoint requires recruiter login in the actual application")
            return True
        
        if response.status_code == 200:
            candidates = response.json()
            print(f"✅ Found {len(candidates)} candidates")
            
            for candidate in candidates:
                print(f"\n👤 Candidate: {candidate.get('email', 'N/A')}")
                print(f"   Interview Score: {candidate.get('interview_score', 'N/A')}")
                print(f"   Evaluation Rating: {candidate.get('evaluation_rating', 'N/A')}")
                print(f"   Has Resume: {candidate.get('has_resume', 'N/A')}")
                print(f"   Has Questions: {candidate.get('has_questions', 'N/A')}")
            
            return True
        
        return False
    
    except Exception as e:
        print(f"❌ Error testing candidate list: {e}")
        return False

def main():
    """Main function."""
    print("🏢 HireIQ Recruiter Dashboard Evaluation Test")
    print("=" * 60)
    
    # Get candidate ID from command line
    if len(sys.argv) < 2:
        print("Usage: python test_evaluation_workflow.py <candidate_id>")
        print("\nThis script tests the evaluation workflow that shows scores in the recruiter dashboard.")
        print("\nWorkflow:")
        print("1. Candidate completes interview (has audio responses)")
        print("2. Recruiter clicks 'Get Score' or 'Evaluate' button")
        print("3. System calls fetch-evaluation endpoint")
        print("4. Evaluation scores appear in the dashboard")
        sys.exit(1)
    
    candidate_id = sys.argv[1]
    
    # Test evaluation fetch
    print("\n🔍 Step 1: Testing evaluation fetch...")
    success = test_fetch_evaluation(candidate_id)
    
    if success:
        print("\n✅ Evaluation workflow test completed successfully!")
        print("\n💡 How this works in the recruiter dashboard:")
        print("   1. Candidates who complete interviews show 'Get Score' button")
        print("   2. Clicking the button calls the fetch-evaluation endpoint")
        print("   3. The evaluation score and rating appear in the Score column")
        print("   4. Scores are cached in the database for future views")
        
        # Test candidate list
        print("\n🔍 Step 2: Testing candidate list...")
        test_candidate_list()
        
    else:
        print("\n❌ Evaluation workflow test failed!")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure Django backend is running")
        print("   2. Verify the candidate ID exists")
        print("   3. Ensure the candidate has uploaded a resume")
        print("   4. Confirm the candidate has completed the interview (has audio responses)")
        print("   5. Check that API keys are properly configured (GEMINI_API_KEY, etc.)")
        
        sys.exit(1)

if __name__ == "__main__":
    main()
