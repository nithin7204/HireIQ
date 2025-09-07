#!/usr/bin/env python3
"""
Debug script to check the actual audio transcription data being used for evaluation.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from candidates.models import Candidate

def debug_candidate_audio_data():
    """Debug what audio data exists for candidates."""
    
    # Get candidates with audio responses
    candidates = Candidate.objects.filter(
        is_active=True,
        audio_responses__exists=True
    )
    
    print(f"🔍 DEBUGGING AUDIO DATA FOR {len(candidates)} CANDIDATES")
    print("=" * 60)
    
    for candidate in candidates:
        print(f"\n📋 CANDIDATE: {candidate.candidate_id}")
        print(f"   Email: {candidate.email}")
        print(f"   Has Resume: {bool(candidate.resume_data)}")
        print(f"   Has Questions: {bool(candidate.interview_questions)}")
        
        if candidate.audio_responses:
            print(f"   Audio Responses: {len(candidate.audio_responses)}")
            
            for i, response in enumerate(candidate.audio_responses):
                print(f"\n   🎤 RESPONSE {i+1}:")
                print(f"      Question: {response.get('question_text', 'NO QUESTION')[:100]}...")
                print(f"      Has Audio URL: {bool(response.get('audio_url'))}")
                print(f"      Has Transcription: {bool(response.get('transcription'))}")
                
                if response.get('transcription'):
                    transcription = response.get('transcription', '')
                    print(f"      Transcription Length: {len(transcription)} chars")
                    print(f"      Transcription Preview: {transcription[:150]}...")
                else:
                    print(f"      ❌ NO TRANSCRIPTION AVAILABLE")
                
                print(f"      Recorded At: {response.get('recorded_at', 'Unknown')}")
        else:
            print(f"   ❌ NO AUDIO RESPONSES")
        
        print(f"   Current Evaluation Score: {candidate.evaluation_score}")
        print(f"   Current Evaluation Rating: {candidate.evaluation_rating}")

if __name__ == "__main__":
    debug_candidate_audio_data()
