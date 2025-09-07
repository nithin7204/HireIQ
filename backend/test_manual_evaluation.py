#!/usr/bin/env python3
"""
Test script to trigger manual evaluation for candidates that show "Evaluating..." status.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from candidates.models import Candidate

def test_manual_evaluation():
    """Test manual evaluation by directly calling the evaluation function."""
    
    # Get candidates with audio responses but no evaluation scores
    candidates = Candidate.objects.filter(
        is_active=True,
        audio_responses__exists=True
    )
    
    print(f"Found {len(candidates)} candidates with audio responses")
    
    for candidate in candidates:
        audio_count = len(candidate.audio_responses) if candidate.audio_responses else 0
        has_evaluation = bool(candidate.evaluation_score)
        
        print(f"\nCandidate: {candidate.candidate_id}")
        print(f"Email: {candidate.email}")
        print(f"Audio responses: {audio_count}")
        print(f"Has evaluation: {has_evaluation}")
        print(f"Evaluation score: {candidate.evaluation_score}")
        print(f"Evaluation rating: {candidate.evaluation_rating}")
        
        # If candidate has audio responses but no evaluation, trigger evaluation
        if audio_count > 0 and not has_evaluation:
            print(f"Triggering evaluation for {candidate.candidate_id}...")
            
            try:
                from candidates.views import auto_evaluate_candidate
                auto_evaluate_candidate(candidate.candidate_id)
                
                # Refresh candidate data
                candidate.reload()
                print(f"✅ Evaluation completed: {candidate.evaluation_score}/10 ({candidate.evaluation_rating})")
                
            except Exception as e:
                print(f"❌ Evaluation failed: {str(e)}")

if __name__ == "__main__":
    test_manual_evaluation()
