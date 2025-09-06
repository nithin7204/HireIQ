from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Check current users'

    def handle(self, *args, **options):
        self.stdout.write("Checking users in database...")
        
        users = User.objects.all()
        self.stdout.write(f"Total users: {len(users)}")
        
        for user in users:
            self.stdout.write(f"User ID: {user.id}")
            self.stdout.write(f"Email: {user.email}")
            self.stdout.write(f"Username: {user.username}")
            self.stdout.write(f"Name: {user.first_name} {user.last_name}")
            self.stdout.write("---")
