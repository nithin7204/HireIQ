from rest_framework import serializers
from .models import Candidate

class CandidateSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    candidate_id = serializers.CharField(read_only=True)
    email = serializers.EmailField()
    created_by_id = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    is_active = serializers.BooleanField(default=True)
    resume_filename = serializers.CharField(read_only=True)
    resume_content_type = serializers.CharField(read_only=True)
    resume_size = serializers.CharField(read_only=True)
    has_resume = serializers.SerializerMethodField()
    has_questions = serializers.SerializerMethodField()
    company = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)
    hr_prompt = serializers.CharField(read_only=True)
    evaluation_score = serializers.CharField(read_only=True)
    evaluation_rating = serializers.CharField(read_only=True)
    interview_score = serializers.SerializerMethodField()
    audio_responses_count = serializers.SerializerMethodField()
    
    def get_interview_score(self, obj):
        """Convert evaluation_score to integer for compatibility"""
        return self._get_interview_score_value(obj)
    
    def get_audio_responses_count(self, obj):
        """Return the number of audio responses"""
        return len(obj.audio_responses) if obj.audio_responses else 0
    
    def get_has_resume(self, obj):
        return bool(obj.resume_data)
    
    def get_has_questions(self, obj):
        return bool(obj.interview_questions)

    def create(self, validated_data):
        # Add the user ID from request context
        validated_data['created_by_id'] = str(self.context['request'].user.id)
        candidate = Candidate(**validated_data)
        candidate.save()
        return candidate

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def to_representation(self, instance):
        if instance is None:
            return None
        return {
            'id': str(instance.id),
            'candidate_id': instance.candidate_id,
            'email': instance.email,
            'created_by_id': instance.created_by_id,
            'created_at': instance.created_at,
            'updated_at': instance.updated_at,
            'is_active': instance.is_active,
            'resume_filename': instance.resume_filename,
            'resume_content_type': instance.resume_content_type,
            'resume_size': instance.resume_size,
            'has_resume': bool(instance.resume_data),
            'has_questions': bool(instance.interview_questions),
            'company': instance.company,
            'role': instance.role,
            'hr_prompt': instance.hr_prompt,
            'evaluation_score': instance.evaluation_score,
            'evaluation_rating': instance.evaluation_rating,
            'interview_score': self._get_interview_score_value(instance),
            'audio_responses_count': len(instance.audio_responses) if instance.audio_responses else 0,
        }
    
    def _get_interview_score_value(self, instance):
        """Helper method to safely convert evaluation_score to interview_score"""
        if instance.evaluation_score:
            try:
                score = float(instance.evaluation_score)
                return min(100, max(0, score * 10))  # Convert to 100-point scale, clamped to 0-100
            except (ValueError, TypeError):
                return None
        return None

class CandidateCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    hr_prompt = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        validated_data['created_by_id'] = str(self.context['request'].user.id)
        candidate = Candidate(**validated_data)
        candidate.save()
        return candidate
