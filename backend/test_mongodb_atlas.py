#!/usr/bin/env python3
"""
Test script to verify MongoDB Atlas connection
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_mongodb_connection():
    """Test MongoDB Atlas connection"""
    try:
        import mongoengine
        from mongoengine import connect
        
        # Get MongoDB URL from environment
        mongodb_url = os.getenv('MONGODB_URL')
        mongodb_name = os.getenv('MONGODB_NAME', 'hireiq_db')
        
        if not mongodb_url:
            print("❌ MONGODB_URL not found in environment variables")
            return False
        
        print(f"🔗 Attempting to connect to MongoDB Atlas...")
        print(f"Database: {mongodb_name}")
        print(f"URL: {mongodb_url[:50]}...")  # Show partial URL for security
        
        # Connect to MongoDB Atlas
        connection = connect(
            db=mongodb_name,
            host=mongodb_url,
            uuidRepresentation='standard'
        )
        
        print("✅ Successfully connected to MongoDB Atlas!")
        
        # Test database operations
        from mongoengine import Document, StringField, EmailField, DateTimeField
        from datetime import datetime
        
        class TestDocument(Document):
            name = StringField(max_length=100)
            email = EmailField()
            created_at = DateTimeField(default=datetime.utcnow)
            
            meta = {
                'collection': 'test_collection'
            }
        
        # Create a test document
        test_doc = TestDocument(
            name="Test User",
            email="test@example.com"
        )
        test_doc.save()
        print("✅ Successfully created test document")
        
        # Retrieve the test document
        retrieved_doc = TestDocument.objects.get(email="test@example.com")
        print(f"✅ Successfully retrieved document: {retrieved_doc.name}")
        
        # Clean up - delete the test document
        retrieved_doc.delete()
        print("✅ Successfully deleted test document")
        
        return True
        
    except ImportError as e:
        print(f"❌ Missing required packages: {e}")
        print("Please install required packages: pip install mongoengine pymongo dnspython")
        return False
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def check_environment():
    """Check if required environment variables are set"""
    required_vars = ['MONGODB_URL', 'MONGODB_NAME']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please check your .env file")
        return False
    
    return True

if __name__ == "__main__":
    print("🧪 MongoDB Atlas Connection Test")
    print("=" * 40)
    
    if not check_environment():
        sys.exit(1)
    
    if test_mongodb_connection():
        print("\n🎉 All tests passed! MongoDB Atlas is ready to use.")
    else:
        print("\n💥 Tests failed. Please check your configuration.")
        sys.exit(1)
