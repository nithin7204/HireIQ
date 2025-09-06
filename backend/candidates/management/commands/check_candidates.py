from django.core.management.base import BaseCommand
from candidates.models import Candidate
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Check candidates in database'

    def handle(self, *args, **options):
        self.stdout.write("Checking candidates in database...")
        
        # Get all candidates
        candidates = Candidate.objects.all()
        self.stdout.write(f"Total candidates: {len(candidates)}")
        
        for candidate in candidates:
            self.stdout.write(f"Candidate: {candidate.email}")
            self.stdout.write(f"  ID: {candidate.candidate_id}")
            self.stdout.write(f"  Created by ID: {candidate.created_by_id}")
            
            # Try to find the user
            try:
                user = User.objects.get(id=candidate.created_by_id)
                self.stdout.write(f"  Created by: {user.email}")
            except User.DoesNotExist:
                self.stdout.write(f"  Created by: USER NOT FOUND")
            except Exception as e:
                self.stdout.write(f"  Created by: ERROR - {e}")
            
            self.stdout.write("---")
        
        # Check current users
        self.stdout.write("\nUsers in database:")
        users = User.objects.all()
        for user in users:
            self.stdout.write(f"User ID: {user.id}, Email: {user.email}")
