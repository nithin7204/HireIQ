from django.core.management.base import BaseCommand
from candidates.models import Candidate
import pymongo
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Update MongoDB indexes to allow same candidate email for different recruiters'

    def handle(self, *args, **options):
        try:
            # Connect to MongoDB directly to manage indexes
            from pymongo import MongoClient
            
            # Get MongoDB connection details from settings
            mongodb_url = os.getenv('MONGODB_URL')
            mongodb_name = os.getenv('MONGODB_NAME', 'hireiq_db')
            
            if not mongodb_url:
                self.stdout.write(self.style.ERROR('MongoDB URL not found in environment variables'))
                return
            
            # Connect to MongoDB
            client = MongoClient(mongodb_url)
            db = client[mongodb_name]
            collection = db.candidate  # mongoengine collection name
            
            self.stdout.write('Connected to MongoDB successfully')
            
            # List current indexes
            self.stdout.write('Current indexes:')
            for index in collection.list_indexes():
                self.stdout.write(f"  {index}")
            
            # Drop the old unique email index if it exists
            try:
                collection.drop_index("email_1")
                self.stdout.write(self.style.SUCCESS('✅ Dropped old email_1 unique index'))
            except pymongo.errors.OperationFailure as e:
                if "index not found" in str(e).lower():
                    self.stdout.write('ℹ️  Old email_1 index not found (already removed)')
                else:
                    self.stdout.write(self.style.WARNING(f'Warning dropping email index: {e}'))
            
            # Create new compound unique index (email + created_by_id)
            try:
                collection.create_index(
                    [("email", 1), ("created_by_id", 1)], 
                    unique=True,
                    name="email_created_by_unique"
                )
                self.stdout.write(self.style.SUCCESS('✅ Created new compound unique index (email + created_by_id)'))
            except pymongo.errors.DuplicateKeyError as e:
                self.stdout.write(self.style.ERROR(f'❌ Cannot create index due to existing duplicates: {e}'))
                self.stdout.write('You may need to clean up duplicate data first')
                return
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error creating compound index: {e}'))
                return
            
            # List updated indexes
            self.stdout.write('\nUpdated indexes:')
            for index in collection.list_indexes():
                self.stdout.write(f"  {index}")
            
            # Test the new logic
            self.stdout.write('\n🧪 Testing new duplicate logic:')
            
            # Count total candidates
            total_candidates = collection.count_documents({})
            self.stdout.write(f'Total candidates in database: {total_candidates}')
            
            # Show candidates by recruiter
            pipeline = [
                {"$group": {"_id": "$created_by_id", "count": {"$sum": 1}, "emails": {"$addToSet": "$email"}}},
                {"$sort": {"count": -1}}
            ]
            
            recruiter_stats = list(collection.aggregate(pipeline))
            self.stdout.write('\nCandidates by recruiter:')
            for stat in recruiter_stats:
                self.stdout.write(f"  Recruiter {stat['_id']}: {stat['count']} candidates")
                if len(stat['emails']) != stat['count']:
                    self.stdout.write(f"    ⚠️  This recruiter has duplicate emails: {stat['emails']}")
            
            self.stdout.write(self.style.SUCCESS('\n✅ Database migration completed successfully!'))
            self.stdout.write('Now different recruiters can invite the same candidate.')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Migration failed: {e}'))
            import traceback
            traceback.print_exc()
