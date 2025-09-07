# GridFS Implementation for Large File Storage in MongoDB
# This is an alternative approach for storing large files (>16MB) in MongoDB

from mongoengine import Document, StringField, EmailField, DateTimeField, BooleanField
from pymongo import MongoClient
import gridfs
import uuid
from datetime import datetime
from django.conf import settings
import os

class CandidateGridFS(Document):
    """
    Alternative Candidate model using GridFS for resume storage
    Use this instead of the BinaryField approach for very large files
    """
    candidate_id = StringField(max_length=100, unique=True, default=lambda: str(uuid.uuid4()))
    email = EmailField(unique=True, required=True)
    created_by_id = StringField(max_length=100, required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    is_active = BooleanField(default=True)
    resume_filename = StringField(max_length=255)
    resume_gridfs_id = StringField(max_length=100)  # GridFS file ID
    resume_content_type = StringField(max_length=100, default='application/pdf')
    resume_size = StringField(max_length=20)
    
    meta = {
        'collection': 'candidates_gridfs',
        'ordering': ['-created_at'],
        'indexes': [
            'email',
            'candidate_id',
            'created_by_id'
        ]
    }

class GridFSHelper:
    """
    Helper class for GridFS operations
    """
    
    def __init__(self):
        # Get MongoDB connection details from settings
        mongodb_url = os.getenv('MONGODB_URL')
        mongodb_name = os.getenv('MONGODB_NAME', 'hireiq_db')
        
        # Create MongoDB client and GridFS instance
        self.client = MongoClient(mongodb_url)
        self.db = self.client[mongodb_name]
        self.fs = gridfs.GridFS(self.db)
    
    def store_file(self, file_data, filename, content_type='application/pdf', metadata=None):
        """
        Store a file in GridFS
        
        Args:
            file_data: Binary file data
            filename: Original filename
            content_type: MIME type
            metadata: Additional metadata dictionary
            
        Returns:
            GridFS file ID
        """
        file_id = self.fs.put(
            file_data,
            filename=filename,
            contentType=content_type,
            metadata=metadata or {}
        )
        return str(file_id)
    
    def get_file(self, file_id):
        """
        Retrieve a file from GridFS
        
        Args:
            file_id: GridFS file ID
            
        Returns:
            GridFS file object or None
        """
        try:
            from bson import ObjectId
            return self.fs.get(ObjectId(file_id))
        except Exception:
            return None
    
    def delete_file(self, file_id):
        """
        Delete a file from GridFS
        
        Args:
            file_id: GridFS file ID
        """
        try:
            from bson import ObjectId
            self.fs.delete(ObjectId(file_id))
        except Exception:
            pass
    
    def file_exists(self, file_id):
        """
        Check if a file exists in GridFS
        
        Args:
            file_id: GridFS file ID
            
        Returns:
            Boolean
        """
        try:
            from bson import ObjectId
            return self.fs.exists(ObjectId(file_id))
        except Exception:
            return False

# Example usage in views:
"""
from .gridfs_models import CandidateGridFS, GridFSHelper

@api_view(['POST'])
@permission_classes([])
def upload_resume_gridfs(request):
    candidate_id = request.data.get('candidate_id')
    resume_file = request.FILES.get('resume')
    
    # ... validation code ...
    
    try:
        candidate = CandidateGridFS.objects.get(candidate_id=candidate_id, is_active=True)
        
        # Delete old resume if exists
        if candidate.resume_gridfs_id:
            gridfs_helper = GridFSHelper()
            gridfs_helper.delete_file(candidate.resume_gridfs_id)
        
        # Store new resume in GridFS
        gridfs_helper = GridFSHelper()
        file_data = resume_file.read()
        
        metadata = {
            'candidate_id': candidate_id,
            'uploaded_at': datetime.utcnow().isoformat()
        }
        
        file_id = gridfs_helper.store_file(
            file_data=file_data,
            filename=resume_file.name,
            content_type='application/pdf',
            metadata=metadata
        )
        
        # Update candidate record
        candidate.resume_filename = resume_file.name
        candidate.resume_gridfs_id = file_id
        candidate.resume_size = str(resume_file.size)
        candidate.save()
        
        return Response({'message': 'Resume uploaded successfully'})
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([])
def download_resume_gridfs(request, candidate_id):
    try:
        candidate = CandidateGridFS.objects.get(candidate_id=candidate_id, is_active=True)
        
        if not candidate.resume_gridfs_id:
            return Response({'error': 'No resume found'}, status=404)
        
        gridfs_helper = GridFSHelper()
        gridfs_file = gridfs_helper.get_file(candidate.resume_gridfs_id)
        
        if not gridfs_file:
            return Response({'error': 'Resume file not found'}, status=404)
        
        response = HttpResponse(
            gridfs_file.read(),
            content_type=gridfs_file.contentType or 'application/pdf'
        )
        
        filename = candidate.resume_filename or f"{candidate_id}_resume.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = gridfs_file.length
        
        return response
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)
"""

# Benefits of GridFS:
# 1. Can handle files larger than 16MB (BSON document limit)
# 2. Automatic chunking of large files
# 3. Built-in metadata support
# 4. Efficient streaming for large files
# 5. Automatic load balancing across shards

# When to use GridFS vs BinaryField:
# - Use BinaryField for files < 10MB (like most resumes)
# - Use GridFS for files > 16MB or when you need advanced file management features
# - GridFS has more overhead for small files but is more efficient for large files
def get_resume_content(candidate_id):
    """
    Get resume content (binary data) for a given candidate ID.
    This function works with both GridFS and regular BinaryField storage.
    
    Args:
        candidate_id (str): Candidate ID
        
    Returns:
        bytes: Resume PDF binary data or None if not found
    """
    try:
        # First try to get from regular Candidate model (most common)
        from .models import Candidate
        
        candidate = Candidate.objects.filter(
            candidate_id=candidate_id, 
            is_active=True
        ).first()
        
        if candidate and candidate.resume_data:
            return candidate.resume_data
        
        # If not found in regular model, try GridFS model
        try:
            candidate_gridfs = CandidateGridFS.objects.filter(
                candidate_id=candidate_id, 
                is_active=True
            ).first()
            
            if candidate_gridfs and candidate_gridfs.resume_gridfs_id:
                gridfs_helper = GridFSHelper()
                gridfs_file = gridfs_helper.get_file(candidate_gridfs.resume_gridfs_id)
                
                if gridfs_file:
                    return gridfs_file.read()
        except Exception as e:
            print(f"Error accessing GridFS: {str(e)}")
        
        return None
        
    except Exception as e:
        print(f"Error in get_resume_content: {str(e)}")
        return None


def get_candidate_resume_info(candidate_id):
    """
    Get resume information (filename, size, content type) for a candidate.
    
    Args:
        candidate_id (str): Candidate ID
        
    Returns:
        dict: Resume info or None if not found
    """
    try:
        # First try regular model
        from .models import Candidate
        
        candidate = Candidate.objects.filter(
            candidate_id=candidate_id, 
            is_active=True
        ).first()
        
        if candidate and candidate.resume_data:
            return {
                'filename': candidate.resume_filename,
                'size': candidate.resume_size,
                'content_type': candidate.resume_content_type,
                'has_resume': True,
                'storage_type': 'binary_field'
            }
        
        # Try GridFS model
        try:
            candidate_gridfs = CandidateGridFS.objects.filter(
                candidate_id=candidate_id, 
                is_active=True
            ).first()
            
            if candidate_gridfs and candidate_gridfs.resume_gridfs_id:
                return {
                    'filename': candidate_gridfs.resume_filename,
                    'size': candidate_gridfs.resume_size,
                    'content_type': candidate_gridfs.resume_content_type,
                    'has_resume': True,
                    'storage_type': 'gridfs'
                }
        except Exception as e:
            print(f"Error accessing GridFS info: {str(e)}")
        
        return {
            'has_resume': False,
            'storage_type': None
        }
        
    except Exception as e:
        print(f"Error in get_candidate_resume_info: {str(e)}")
        return {
            'has_resume': False,
            'error': str(e)
        }
