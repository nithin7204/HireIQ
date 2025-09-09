from django.core.management.base import BaseCommand
from candidates.models import Candidate
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Clean up candidate data and fix user associations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete-all',
            action='store_true',
            help='Delete all existing candidates',
        )

    def handle(self, *args, **options):
        self.stdout.write("Candidate Database Cleanup Tool")
        self.stdout.write("=" * 40)
        
        # Get all candidates
        candidates = Candidate.objects.all()
        total_candidates = len(candidates)
        
        self.stdout.write(f"Total candidates found: {total_candidates}")
        
        if total_candidates == 0:
            self.stdout.write(self.style.SUCCESS("No candidates found. Database is clean."))
            return
        
        # Show candidate details
        self.stdout.write("\nCandidate Details:")
        user_groups = {}
        
        for i, candidate in enumerate(candidates, 1):
            created_by = candidate.created_by_id
            if created_by not in user_groups:
                user_groups[created_by] = []
            user_groups[created_by].append(candidate)
            
            self.stdout.write(
                f"{i}. Email: {candidate.email}, "
                f"Created by ID: {candidate.created_by_id}, "
                f"Created at: {candidate.created_at.strftime('%Y-%m-%d %H:%M')}"
            )
        
        self.stdout.write("\nSummary by User:")
        for user_id, user_candidates in user_groups.items():
            try:
                user = User.objects.get(id=user_id)
                user_email = user.email
            except:
                user_email = "Unknown"
            
            self.stdout.write(f"User ID {user_id} ({user_email}): {len(user_candidates)} candidates")
            
        if options['delete_all']:
            self.stdout.write(f"\nDeleting all {total_candidates} candidates...")
            deleted_count = 0
            for candidate in candidates:
                candidate.delete()
                deleted_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(f"Successfully deleted {deleted_count} candidates.")
            )
            self.stdout.write(
                self.style.SUCCESS("Database is now clean. New users will see empty dashboard.")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"\nTo delete all {total_candidates} candidates, run: "
                    "python manage.py cleanup_candidates --delete-all"
                )
            )
