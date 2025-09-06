from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponse
from mongoengine.errors import DoesNotExist, ValidationError
import os
import uuid
from .models import Candidate
from .serializers import CandidateSerializer, CandidateCreateSerializer

class CandidateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CandidateCreateSerializer
        return CandidateSerializer
    
    def get_queryset(self):
        try:
            # Get candidates created by the current user
            return Candidate.objects.filter(created_by_id=str(self.request.user.id))
        except Exception as e:
            return []
    
    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = CandidateSerializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': 'Failed to fetch candidates'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            try:
                candidate = serializer.save()
                
                # Send email to candidate with their ID
                subject = 'Your HireIQ Candidate ID'
                message = f'''
Dear Candidate,

You have been invited to participate in the HireIQ interview process.

Your Candidate ID is: {candidate.candidate_id}

Please use this ID to access the interview portal.

Best regards,
HireIQ Team
                '''
                
                try:
                    send_mail(
                        subject,
                        message,
                        settings.EMAIL_HOST_USER,
                        [candidate.email],
                        fail_silently=False,
                    )
                except Exception as e:
                    # Log the error but don't fail the creation
                    print(f"Failed to send email: {e}")
                
                return Response(
                    CandidateSerializer(candidate).data, 
                    status=status.HTTP_201_CREATED
                )
            except ValidationError as e:
                return Response(
                    {'error': f'Validation error: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                return Response(
                    {'error': f'Failed to create candidate: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([])
def validate_candidate_id(request):
    candidate_id = request.data.get('candidate_id')
    
    if not candidate_id:
        return Response(
            {'error': 'Candidate ID is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        candidate = Candidate.objects.get(candidate_id=candidate_id, is_active=True)
        return Response(
            {'valid': True, 'candidate': CandidateSerializer(candidate).data}, 
            status=status.HTTP_200_OK
        )
    except DoesNotExist:
        return Response(
            {'valid': False, 'error': 'Invalid candidate ID'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Validation failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([])
def upload_resume(request):
    candidate_id = request.data.get('candidate_id')
    resume_file = request.FILES.get('resume')
    
    if not candidate_id:
        return Response(
            {'error': 'Candidate ID is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not resume_file:
        return Response(
            {'error': 'Resume file is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate file type (PDF only)
    if not resume_file.name.lower().endswith('.pdf'):
        return Response(
            {'error': 'Only PDF files are allowed'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate file size (10MB max)
    if resume_file.size > 10 * 1024 * 1024:
        return Response(
            {'error': 'File size must be less than 10MB'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get candidate
        candidate = Candidate.objects.get(candidate_id=candidate_id, is_active=True)
        
        # Read file data
        file_data = resume_file.read()
        
        # Update candidate record with binary data
        candidate.resume_filename = resume_file.name
        candidate.resume_data = file_data
        candidate.resume_content_type = 'application/pdf'
        candidate.resume_size = str(resume_file.size)
        candidate.save()
        
        return Response(
            {
                'message': 'Resume uploaded successfully',
                'candidate': CandidateSerializer(candidate).data
            }, 
            status=status.HTTP_200_OK
        )
        
    except DoesNotExist:
        return Response(
            {'error': 'Invalid candidate ID'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Upload failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([])
def download_resume(request, candidate_id):
    try:
        # Get candidate
        candidate = Candidate.objects.get(candidate_id=candidate_id, is_active=True)
        
        if not candidate.resume_data:
            return Response(
                {'error': 'No resume found for this candidate'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create HTTP response with PDF data
        response = HttpResponse(
            candidate.resume_data, 
            content_type=candidate.resume_content_type or 'application/pdf'
        )
        
        # Set filename for download
        filename = candidate.resume_filename or f"{candidate_id}_resume.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = candidate.resume_size or len(candidate.resume_data)
        
        return response
        
    except DoesNotExist:
        return Response(
            {'error': 'Invalid candidate ID'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Download failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
