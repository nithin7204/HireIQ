# MongoDB PDF Storage Implementation

## Overview
The HireIQ application now stores PDF resumes directly in MongoDB using MongoEngine's BinaryField. This eliminates the need for separate file storage and keeps all candidate data centralized in the database.

## Implementation Details

### Backend Changes

#### 1. Updated Candidate Model (`candidates/models.py`)
```python
class Candidate(Document):
    # ... existing fields ...
    resume_filename = StringField(max_length=255)  # Original filename
    resume_data = BinaryField()  # PDF binary data stored in MongoDB
    resume_content_type = StringField(max_length=100, default='application/pdf')
    resume_size = StringField(max_length=20)  # File size in bytes
```

#### 2. Updated Serializer (`candidates/serializers.py`)
- Added new fields: `resume_content_type`, `resume_size`, `has_resume`
- `has_resume` is a computed field that returns `True` if `resume_data` exists

#### 3. Updated Views (`candidates/views.py`)
- **`upload_resume`**: Stores PDF binary data directly in MongoDB
- **`download_resume`**: New endpoint to retrieve and serve PDF files from MongoDB
- Validates file type (PDF only) and size (max 10MB)

#### 4. New URL Endpoint (`candidates/urls.py`)
```python
path('download-resume/<str:candidate_id>/', download_resume, name='download-resume')
```

### Frontend Changes

#### 1. Updated Interfaces
Updated `Candidate` interface to include new fields:
- `resume_content_type`
- `resume_size` 
- `has_resume`

#### 2. Enhanced CandidatePortal Component
- Shows file size information
- Added download button for uploaded resumes
- Better visual feedback for upload status
- Uses `has_resume` field instead of checking filename

## Benefits of MongoDB Storage

### 1. **Centralized Data Management**
- All candidate data (including resumes) in one database
- No need to manage separate file storage systems
- Simplified backup and replication

### 2. **Data Consistency**
- Transactional integrity between candidate records and resumes
- No orphaned files if candidate records are deleted
- Atomic operations for data and file updates

### 3. **Scalability**
- MongoDB handles binary data efficiently
- Automatic sharding support for large datasets
- Built-in replication and high availability

### 4. **Security**
- Database-level access control
- No direct file system access required
- Encrypted at rest with MongoDB Atlas

### 5. **Deployment Simplicity**
- No need to configure file storage systems
- Works seamlessly with cloud databases
- No file system permissions to manage

## Storage Limits and Considerations

### Current Implementation (BinaryField)
- **Recommended for**: Files up to 10MB (typical resume size)
- **MongoDB document limit**: 16MB maximum
- **Memory usage**: Entire file loaded into memory during operations

### Alternative: GridFS Implementation
For larger files or advanced file management needs, see `candidates/gridfs_models.py` which provides:
- Support for files larger than 16MB
- Automatic file chunking
- Stream-based file operations
- Advanced metadata support

## API Endpoints

### Upload Resume
```
POST /api/candidates/upload-resume/
Content-Type: multipart/form-data

Form Data:
- candidate_id: string
- resume: file (PDF only, max 10MB)
```

### Download Resume
```
GET /api/candidates/download-resume/{candidate_id}/
Response: PDF file with appropriate headers
```

### Validate Candidate
```
POST /api/candidates/validate/
Response includes has_resume field indicating if resume is uploaded
```

## Testing

Run the test script to verify MongoDB storage:
```bash
cd backend
python test_pdf_storage.py
```

The test creates a candidate, stores a test PDF, retrieves it, verifies content integrity, and cleans up.

## Migration Notes

### From File System to MongoDB
If migrating from file system storage:

1. Read existing files from the file system
2. Store binary data in `resume_data` field
3. Update `resume_filename`, `resume_size`, and `resume_content_type`
4. Remove `resume_url` field references
5. Clean up old files after successful migration

### Database Considerations
- Monitor MongoDB document sizes
- Consider GridFS for files approaching 16MB limit
- Implement data archival strategy for old resumes if needed

## Performance Optimization

### For High-Volume Applications
1. **Indexing**: Ensure proper indexing on `candidate_id` for fast lookups
2. **Caching**: Consider caching frequently accessed resumes
3. **Compression**: MongoDB automatically compresses binary data
4. **GridFS**: Use for files >10MB or when streaming is important

### Memory Management
- Files are loaded entirely into memory during upload/download
- Monitor memory usage with large files
- Consider streaming for very large files using GridFS

## Security Considerations

1. **File Type Validation**: Only PDF files are accepted
2. **Size Limits**: 10MB maximum to prevent abuse
3. **Access Control**: Download endpoint validates candidate ID
4. **Content Scanning**: Consider adding virus scanning for uploaded files
5. **Rate Limiting**: Implement rate limiting for upload endpoints

## Backup and Recovery

### MongoDB Backup
- Regular MongoDB Atlas backups include resume data
- Point-in-time recovery preserves file consistency
- No separate backup strategy needed for files

### Data Export
```python
# Export resume data
candidate = Candidate.objects.get(candidate_id="...")
with open(f"{candidate.candidate_id}_resume.pdf", "wb") as f:
    f.write(candidate.resume_data)
```

## Monitoring and Maintenance

### Key Metrics to Monitor
1. Average document size growth
2. Upload success/failure rates
3. Storage usage trends
4. Download response times

### Maintenance Tasks
1. Regular cleanup of test data
2. Monitor for corrupted binary data
3. Validate file integrity periodically
4. Archive old candidate data as needed

This implementation provides a robust, scalable solution for storing PDF resumes directly in MongoDB while maintaining data integrity and providing excellent performance for typical resume file sizes.
