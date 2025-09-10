#!/usr/bin/env python3
"""
Test script to verify the AI report fix works correctly
"""

import os
import sys
import django
import requests
from django.contrib.auth.models import User

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from candidates.models import Candidate

def test_ai_report_fix():
    print("🔍 Testing AI Report Fix...")
    print("=" * 50)
    
    # Find a candidate with evaluation data
    candidates_with_evaluation = Candidate.objects.filter(
        evaluation_score__exists=True,
        evaluation_score__ne=None
    )
    
    print(f"📊 Found {candidates_with_evaluation.count()} candidates with evaluation data")
    
    for candidate in candidates_with_evaluation[:3]:  # Test first 3
        print(f"\n🎯 Testing candidate: {candidate.email}")
        print(f"   📧 Candidate ID: {candidate.candidate_id}")
        print(f"   👤 Created by ID: {candidate.created_by_id}")
        print(f"   📊 Evaluation Score: {candidate.evaluation_score}")
        print(f"   ⭐ Evaluation Rating: {candidate.evaluation_rating}")
        
        # Calculate interview score like the view does
        if candidate.evaluation_score:
            try:
                score = float(candidate.evaluation_score)
                interview_score = min(100, max(0, score * 10))
                print(f"   🎯 Calculated Interview Score: {interview_score}")
            except (ValueError, TypeError):
                print(f"   ❌ Error calculating interview score")
        
        # Check if there's a user with this created_by_id
        try:
            user = User.objects.get(id=candidate.created_by_id)
            print(f"   ✅ Found user: {user.email}")
        except User.DoesNotExist:
            print(f"   ❌ User not found for created_by_id: {candidate.created_by_id}")
        except Exception as e:
            print(f"   ❌ Error finding user: {e}")

if __name__ == "__main__":
    test_ai_report_fix()
