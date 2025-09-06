"""
MongoDB Atlas connection utilities for HireIQ backend
"""
import os
import mongoengine
from django.conf import settings

def connect_to_mongodb():
    """
    Connect to MongoDB Atlas using the configuration from environment variables
    """
    try:
        mongodb_url = os.getenv('MONGODB_URL')
        mongodb_name = os.getenv('MONGODB_NAME', 'hireiq_db')
        
        if not mongodb_url:
            raise ValueError("MONGODB_URL environment variable not set")
        
        # Replace <db_password> placeholder with actual password if needed
        if '<db_password>' in mongodb_url:
            db_password = os.getenv('MONGODB_PASSWORD')
            if db_password:
                mongodb_url = mongodb_url.replace('<db_password>', db_password)
            else:
                raise ValueError("MONGODB_PASSWORD environment variable not set")
        
        # Connect to MongoDB Atlas
        mongoengine.connect(
            db=mongodb_name,
            host=mongodb_url,
            uuidRepresentation='standard',
            retryWrites=True,
            w='majority'
        )
        
        print(f"✅ Successfully connected to MongoDB Atlas database: {mongodb_name}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB Atlas: {e}")
        return False

def disconnect_from_mongodb():
    """
    Disconnect from MongoDB
    """
    try:
        mongoengine.disconnect()
        print("✅ Disconnected from MongoDB Atlas")
    except Exception as e:
        print(f"❌ Error disconnecting from MongoDB: {e}")

def get_database_info():
    """
    Get information about the current database connection
    """
    try:
        connection = mongoengine.connection.get_connection()
        database = mongoengine.connection.get_db()
        
        return {
            'connected': True,
            'database_name': database.name,
            'host': connection.HOST,
            'port': connection.PORT
        }
    except Exception as e:
        return {
            'connected': False,
            'error': str(e)
        }
