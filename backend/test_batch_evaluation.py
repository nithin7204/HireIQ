#!/usr/bin/env python3
"""
Test script for batch_evaluate_answers endpoint.
This script reads the test JSON file and sends a POST request to the batch evaluation endpoint.
"""

import json
import requests
import sys
import os

# Configuration
BACKEND_URL = "http://localhost:8000"  # Adjust if your backend runs on a different port
ENDPOINT = "/api/candidates/batch-evaluate/"

def load_test_data(file_path):
    """Load test data from JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Test file '{file_path}' not found.")
        return None
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in test file: {e}")
        return None

def test_batch_evaluation(test_data, candidate_id=None):
    """Test the batch evaluation endpoint."""
    # Override candidate_id if provided
    if candidate_id:
        test_data['candidate_id'] = candidate_id
        print(f"Using candidate ID: {candidate_id}")
    
    print(f"Testing batch evaluation with {len(test_data['evaluations'])} questions...")
    print(f"Candidate ID: {test_data['candidate_id']}")
    
    try:
        # Send POST request
        response = requests.post(
            f"{BACKEND_URL}{ENDPOINT}",
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=120  # 2 minutes timeout for batch processing
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
            print("✅ Batch evaluation successful!")
            
            # Display summary
            if 'summary' in response_data:
                summary = response_data['summary']
                print(f"\n📊 EVALUATION SUMMARY:")
                print(f"   Total Questions: {summary.get('total_questions', 'N/A')}")
                print(f"   Successful Evaluations: {summary.get('successful_evaluations', 'N/A')}")
                print(f"   Failed Evaluations: {summary.get('failed_evaluations', 'N/A')}")
                print(f"   Average Score: {summary.get('average_score', 'N/A')}/10")
                print(f"   Overall Rating: {summary.get('overall_rating', 'N/A')}")
            
            # Display individual results
            if 'results' in response_data:
                print(f"\n📝 INDIVIDUAL RESULTS:")
                for result in response_data['results']:
                    idx = result.get('index', 'N/A')
                    if 'error' in result:
                        print(f"   Question {idx + 1}: ❌ {result['error']}")
                    else:
                        evaluation = result.get('evaluation', {})
                        score = evaluation.get('overall_score', 'N/A')
                        print(f"   Question {idx + 1}: ✅ Score: {score}/10")
            
            return True
            
        elif response.status_code == 404:
            print("❌ Error: Candidate not found or no resume uploaded")
            print(f"Make sure candidate ID '{test_data['candidate_id']}' exists and has a resume uploaded")
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
        print("Batch evaluation might take longer for many questions")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Main function."""
    print("🧪 HireIQ Batch Evaluation Test Script")
    print("=" * 50)
    
    # Get test file path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    test_file = os.path.join(script_dir, "test_batch_evaluation_input.json")
    
    # Load test data
    test_data = load_test_data(test_file)
    if not test_data:
        sys.exit(1)
    
    # Get candidate ID from command line if provided
    candidate_id = None
    if len(sys.argv) > 1:
        candidate_id = sys.argv[1]
    
    # Run test
    success = test_batch_evaluation(test_data, candidate_id)
    
    if success:
        print("\n✅ Test completed successfully!")
        print("\n💡 Tips:")
        print("   - Check the detailed evaluation results in the response")
        print("   - Use the summary to get an overview of candidate performance")
        print("   - Failed evaluations might indicate API key issues or malformed data")
    else:
        print("\n❌ Test failed!")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure Django backend is running (python manage.py runserver)")
        print("   2. Verify the candidate ID exists and has a resume uploaded")
        print("   3. Check that GEMINI_API_KEY is properly configured")
        print("   4. Ensure all required dependencies are installed")
        
        sys.exit(1)

if __name__ == "__main__":
    print("Usage: python test_batch_evaluation.py [candidate_id]")
    print("If candidate_id is provided, it will override the one in the JSON file.")
    print()
    main()
