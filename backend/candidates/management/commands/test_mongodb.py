from django.core.management.base import BaseCommand
from django.conf import settings
import os
import mongoengine
from candidates.models import Candidate

class Command(BaseCommand):
    help = 'Test MongoDB Atlas connection and basic operations'

    def handle(self, *args, **options):
        self.stdout.write("🧪 Testing MongoDB Atlas Connection...")
        
        try:
            # Test connection
            mongodb_url = os.getenv('MONGODB_URL')
            mongodb_name = os.getenv('MONGODB_NAME', 'hireiq_db')
            
            if not mongodb_url:
                self.stdout.write(
                    self.style.ERROR('❌ MONGODB_URL not found in environment variables')
                )
                return
            
            self.stdout.write(f"🔗 Connecting to database: {mongodb_name}")
            
            # Test basic operations
            self.stdout.write("📝 Testing Candidate model operations...")
            
            # Count existing candidates
            candidate_count = Candidate.objects.count()
            self.stdout.write(f"📊 Found {candidate_count} existing candidates")
            
            # Test creating a candidate (for testing purposes)
            test_email = "test_mongodb@example.com"
            
            # Clean up any existing test candidate
            try:
                existing_test = Candidate.objects.get(email=test_email)
                existing_test.delete()
                self.stdout.write("🧹 Cleaned up existing test candidate")
            except mongoengine.DoesNotExist:
                pass
            
            # Create test candidate
            test_candidate = Candidate(
                email=test_email,
                created_by_id="test_user_123"
            )
            test_candidate.save()
            
            self.stdout.write(
                self.style.SUCCESS(f"✅ Successfully created test candidate: {test_candidate.candidate_id}")
            )
            
            # Retrieve test candidate
            retrieved = Candidate.objects.get(email=test_email)
            self.stdout.write(
                self.style.SUCCESS(f"✅ Successfully retrieved candidate: {retrieved.email}")
            )
            
            # Update test candidate
            retrieved.is_active = False
            retrieved.save()
            self.stdout.write("✅ Successfully updated candidate")
            
            # Clean up test candidate
            retrieved.delete()
            self.stdout.write("✅ Successfully deleted test candidate")
            
            self.stdout.write(
                self.style.SUCCESS("\n🎉 All MongoDB Atlas tests passed! Database is ready to use.")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ MongoDB Atlas test failed: {str(e)}")
            )
            self.stdout.write(
                self.style.WARNING("💡 Make sure to:")
            )
            self.stdout.write("   1. Replace <db_password> in MONGODB_URL with your actual password")
            self.stdout.write("   2. Whitelist your IP address in MongoDB Atlas")
            self.stdout.write("   3. Check your network connection")
