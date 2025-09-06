from django.core.management.base import BaseCommand
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

class Command(BaseCommand):
    help = 'Check raw MongoDB data'

    def handle(self, *args, **options):
        try:
            # Connect to MongoDB directly
            mongodb_url = os.getenv('MONGODB_URL')
            client = MongoClient(mongodb_url)
            db = client['hireiq_db']
            candidates_collection = db['candidates']
            
            self.stdout.write("Checking raw MongoDB data...")
            
            # Get all documents
            documents = list(candidates_collection.find())
            self.stdout.write(f"Total documents: {len(documents)}")
            
            for doc in documents:
                self.stdout.write(f"Document ID: {doc.get('_id')}")
                self.stdout.write(f"Email: {doc.get('email')}")
                self.stdout.write(f"Created by ID: {doc.get('created_by_id')}")
                self.stdout.write(f"Fields: {list(doc.keys())}")
                self.stdout.write("---")
                
        except Exception as e:
            self.stdout.write(f"Error: {e}")
