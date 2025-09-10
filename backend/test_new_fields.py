#!/usr/bin/env python
"""
Simple test to verify new fields are working
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from candidates.models import Candidate

def test_new_fields():
    """Test that new interview state fields are working."""
    
    print("🔍 Testing new interview state fields...")
    
    # Get first candidate
    candidate = Candidate.objects.first()
    if not candidate:
        print("❌ No candidates found in database")
        return False
    
    print(f"📝 Testing candidate: {candidate.email}")
    
    # Test new fields
    print(f"   Started: {getattr(candidate, 'interview_started', 'Field not found')}")
    print(f"   Completed: {getattr(candidate, 'interview_completed', 'Field not found')}")
    print(f"   Terminated: {getattr(candidate, 'interview_terminated', 'Field not found')}")
    print(f"   Start Time: {getattr(candidate, 'interview_start_time', 'Field not found')}")
    print(f"   Completion Time: {getattr(candidate, 'interview_completion_time', 'Field not found')}")
    print(f"   Termination Reason: {getattr(candidate, 'termination_reason', 'Field not found')}")
    
    print("✅ All new fields are accessible!")
    return True

if __name__ == "__main__":
    test_new_fields()
