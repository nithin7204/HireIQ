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
    
    def get_has_resume(self, obj):
        return bool(obj.resume_data)

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
        }

class CandidateCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def create(self, validated_data):
        validated_data['created_by_id'] = str(self.context['request'].user.id)
        candidate = Candidate(**validated_data)
        candidate.save()
        return candidate
