#!/usr/bin/env python
"""
Migration script to add new interview state tracking fields to existing candidates.

This script adds the following fields to the Candidate model:
- interview_started: BooleanField(default=False)
- interview_start_time: DateTimeField()
- interview_completed: BooleanField(default=False)
- interview_completion_time: DateTimeField()
- interview_terminated: BooleanField(default=False)
- termination_reason: StringField(max_length=255)

Run this script from the backend directory with:
python migrate_interview_fields.py
"""

import os
import sys
import django
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from candidates.models import Candidate

def migrate_candidates():
    """Add new interview state fields to existing candidates."""
    
    print("🔄 Starting migration of candidate interview state fields...")
    
    try:
        # Get all existing candidates
        candidates = Candidate.objects.all()
        updated_count = 0
        
        for candidate in candidates:
            # Check if the candidate already has the new fields
            if not hasattr(candidate, 'interview_started') or candidate.interview_started is None:
                candidate.interview_started = False
            
            if not hasattr(candidate, 'interview_completed') or candidate.interview_completed is None:
                candidate.interview_completed = False
            
            if not hasattr(candidate, 'interview_terminated') or candidate.interview_terminated is None:
                candidate.interview_terminated = False
            
            # For candidates with evaluation data, mark as completed
            if candidate.evaluation_score and not candidate.interview_completed:
                candidate.interview_completed = True
                candidate.interview_completion_time = candidate.evaluation_timestamp or datetime.utcnow()
                print(f"✅ Marked candidate {candidate.email} as completed (has evaluation)")
            
            # For candidates with questions but no evaluation, mark as started
            if candidate.interview_questions and not candidate.interview_started:
                candidate.interview_started = True
                candidate.interview_start_time = candidate.created_at
                print(f"✅ Marked candidate {candidate.email} as started (has questions)")
            
            candidate.save()
            updated_count += 1
        
        print(f"✅ Successfully migrated {updated_count} candidates")
        print("🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = migrate_candidates()
    if not success:
        sys.exit(1)
