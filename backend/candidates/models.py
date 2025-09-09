from mongoengine import Document, StringField, EmailField, ReferenceField, DateTimeField, BooleanField, BinaryField, DictField, ListField
import uuid
from datetime import datetime
from django.contrib.auth.models import User

class Candidate(Document):
    candidate_id = StringField(max_length=100, unique=True, default=lambda: str(uuid.uuid4()))
    email = EmailField(required=True)  # Removed unique=True to allow same email for different recruiters
    created_by_id = StringField(max_length=100, required=True)  # Store user ID as string
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    is_active = BooleanField(default=True)
    resume_filename = StringField(max_length=255)  # Store original filename
    resume_data = BinaryField()  # Store PDF binary data
    resume_content_type = StringField(max_length=100, default='application/pdf')  # MIME type
    resume_size = StringField(max_length=20)  # File size in bytes
    resume_url = StringField(max_length=500)  # For backward compatibility with old records
    
    # Interview fields
    company = StringField(max_length=255)
    role = StringField(max_length=255)
    hr_prompt = StringField()
    interview_questions = DictField()  # Store generated questions
    
    # Audio responses
    audio_responses = ListField(DictField())  # Store audio responses with metadata
    
    # Evaluation results
    evaluation_score = StringField(max_length=10)  # Overall score (e.g., "8.5")
    evaluation_rating = StringField(max_length=50)  # Overall rating (e.g., "Excellent", "Good")
    
    # Note: Uniqueness is handled at application level in views.py
    # Different recruiters can invite the same candidate
    # Same recruiter cannot invite same candidate twice
    evaluation_data = DictField()  # Store complete evaluation results
    evaluation_timestamp = DateTimeField()  # When evaluation was completed
    
    meta = {
        'collection': 'candidates',
        'ordering': ['-created_at'],
        'indexes': [
            'email',
            'candidate_id',
            'created_by_id'
        ]
    }
    
    def __str__(self):
        return f"{self.email} - {self.candidate_id}"
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        if not self.candidate_id:
            self.candidate_id = str(uuid.uuid4())
        return super().save(*args, **kwargs)
    
    @classmethod
    def get_by_email(cls, email):
        try:
            return cls.objects.get(email=email)
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def get_by_id(cls, candidate_id):
        try:
            return cls.objects.get(candidate_id=candidate_id)
        except cls.DoesNotExist:
            return None
    
    @property
    def has_resume(self):
        return bool(self.resume_data)
    
    @property
    def has_questions(self):
        return bool(self.interview_questions)
