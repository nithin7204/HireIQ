#!/usr/bin/env python3
"""
MongoDB Atlas Connection Test Script

This script tests the connection to MongoDB Atlas using the settings
from your Django project.
"""

import os
import sys
import django
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hireiq_backend.settings')
django.setup()

from django.conf import settings
import pymongo
from pymongo import MongoClient

def test_mongodb_connection():
    """Test the MongoDB Atlas connection."""
    print("🔍 Testing MongoDB Atlas Connection...")
    print("-" * 50)
    
    try:
        # Get the MongoDB URL from Django settings
        db_config = settings.DATABASES['default']
        mongodb_url = db_config['CLIENT']['host']
        database_name = db_config['NAME']
        
        print(f"📊 Database Name: {database_name}")
        print(f"🔗 Connection URL: {mongodb_url[:50]}..." if len(mongodb_url) > 50 else f"🔗 Connection URL: {mongodb_url}")
        
        # Create MongoDB client
        client = MongoClient(mongodb_url)
        
        # Test the connection
        print("\n⏳ Attempting to connect...")
        client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!")
        
        # Get database
        db = client[database_name]
        
        # List collections
        print(f"\n📂 Collections in '{database_name}' database:")
        collections = db.list_collection_names()
        if collections:
            for collection in collections:
                count = db[collection].count_documents({})
                print(f"   • {collection}: {count} documents")
        else:
            print("   • No collections found (this is normal for a new database)")
        
        # Test basic operations
        print("\n🧪 Testing basic operations...")
        test_collection = db.test_connection
        
        # Insert a test document
        test_doc = {"test": True, "message": "Connection test successful"}
        result = test_collection.insert_one(test_doc)
        print(f"✅ Insert test: Document inserted with ID {result.inserted_id}")
        
        # Query the test document
        found_doc = test_collection.find_one({"test": True})
        if found_doc:
            print(f"✅ Query test: Found document with message: '{found_doc['message']}'")
        
        # Delete the test document
        delete_result = test_collection.delete_one({"test": True})
        print(f"✅ Delete test: Deleted {delete_result.deleted_count} document(s)")
        
        # Clean up - remove test collection if it's empty
        if test_collection.count_documents({}) == 0:
            db.drop_collection('test_connection')
        
        print("\n🎉 All tests passed! MongoDB Atlas is properly configured.")
        
        # Server info
        server_info = client.server_info()
        print(f"\n📋 Server Info:")
        print(f"   • MongoDB Version: {server_info['version']}")
        print(f"   • Max BSON Object Size: {server_info['maxBsonObjectSize'] / (1024*1024):.1f} MB")
        
    except pymongo.errors.ServerSelectionTimeoutError:
        print("❌ Connection Error: Could not connect to MongoDB Atlas")
        print("   Check your connection string and network access settings")
        return False
    except pymongo.errors.OperationFailure as e:
        print(f"❌ Authentication Error: {e}")
        print("   Check your username and password in the connection string")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False
    finally:
        try:
            client.close()
            print("\n🔒 Connection closed.")
        except:
            pass
    
    return True

def print_connection_help():
    """Print helpful information about MongoDB Atlas setup."""
    print("\n" + "=" * 60)
    print("🆘 NEED HELP WITH MONGODB ATLAS SETUP?")
    print("=" * 60)
    print("If the connection test failed, here's what to check:")
    print()
    print("1. 🔐 Credentials:")
    print("   • Make sure username and password are correct")
    print("   • Password should be URL-encoded if it contains special characters")
    print()
    print("2. 🌐 Network Access:")
    print("   • Your IP address must be whitelisted in MongoDB Atlas")
    print("   • Check Network Access settings in Atlas dashboard")
    print()
    print("3. 📝 Connection String:")
    print("   • Should start with 'mongodb+srv://'")
    print("   • Should include database name in the path")
    print()
    print("4. 📄 Environment Variables:")
    print("   • Check that .env file is in the backend directory")
    print("   • Make sure MONGODB_URL is properly set")
    print()
    print("For detailed setup instructions, see: MONGODB_ATLAS_SETUP.md")
    print("=" * 60)

if __name__ == "__main__":
    print("HireIQ - MongoDB Atlas Connection Test")
    print("=" * 50)
    
    success = test_mongodb_connection()
    
    if not success:
        print_connection_help()
        sys.exit(1)
    else:
        print("\n✨ Your MongoDB Atlas setup is ready for HireIQ!")
