from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
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
            user_id = str(self.request.user.id)
            print(f"Fetching candidates for user ID: {user_id}")
            
            # Get candidates created by the current user
            candidates = Candidate.objects.filter(created_by_id=user_id)
            print(f"Found {len(candidates)} candidates")
            
            return candidates
        except Exception as e:
            print(f"Error fetching candidates: {str(e)}")
            return []
    
    def list(self, request, *args, **kwargs):
        try:
            print(f"List request from user: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
            
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            queryset = self.get_queryset()
            serializer = CandidateSerializer(queryset, many=True)
            
            print(f"Returning {len(serializer.data)} candidates")
            return Response(serializer.data)
        except Exception as e:
            print(f"List error: {str(e)}")
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

class ResumeUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = []
    
    def post(self, request, *args, **kwargs):
        print(f"Upload request received - Method: {request.method}")
        print(f"Content-Type: {request.content_type}")
        print(f"Request data keys: {list(request.data.keys()) if hasattr(request, 'data') else 'No data'}")
        print(f"Request FILES keys: {list(request.FILES.keys()) if hasattr(request, 'FILES') else 'No FILES'}")
        
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
            print(f"Found candidate: {candidate.email}")
            
            # Read file data
            file_data = resume_file.read()
            print(f"File data size: {len(file_data)} bytes")
            print(f"File name: {resume_file.name}")
            print(f"File content type: {resume_file.content_type}")
            
            # Update candidate record with binary data
            candidate.resume_filename = resume_file.name
            candidate.resume_data = file_data
            candidate.resume_content_type = resume_file.content_type or 'application/pdf'
            candidate.resume_size = str(resume_file.size)
            candidate.save()
            print(f"Successfully saved resume for candidate: {candidate.candidate_id}")
            
            # Verify the save worked
            saved_candidate = Candidate.objects.get(candidate_id=candidate_id)
            print(f"Verification - Has resume data: {bool(saved_candidate.resume_data)}")
            print(f"Verification - Resume size: {saved_candidate.resume_size}")
            
            return Response(
                {
                    'message': 'Resume uploaded successfully',
                    'candidate': CandidateSerializer(candidate).data
                }, 
                status=status.HTTP_200_OK
            )
            
        except DoesNotExist:
            print(f"Candidate not found: {candidate_id}")
            return Response(
                {'error': 'Invalid candidate ID'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Upload error: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Upload failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
@permission_classes([])
def upload_resume(request):
    print(f"Upload request received - Method: {request.method}")
    print(f"Content-Type: {request.content_type}")
    print(f"Request data keys: {list(request.data.keys()) if hasattr(request, 'data') else 'No data'}")
    print(f"Request FILES keys: {list(request.FILES.keys()) if hasattr(request, 'FILES') else 'No FILES'}")
    
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

@api_view(['POST'])
@permission_classes([])
def generate_interview_questions(request):
    """
    Expects POST data:
    - resume: PDF file (multipart/form-data)
    - HR_prompt: HR prompt string
    - company: Company name
    - role: Role name
    """
    resume_file = request.FILES.get("resume")
    HR_prompt = request.data.get("HR_prompt")
    company = request.data.get("company")
    role = request.data.get("role")

    if not all([resume_file, HR_prompt, company, role]):
        return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Check if API keys are configured
        import os
        if not os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY") == "your_groq_api_key_here":
            return Response({
                "error": "GROQ_API_KEY not configured. Please add your API key to the .env file.",
                "setup_instructions": "Get your GROQ API key from https://console.groq.com/keys"
            }, status=status.HTTP_501_NOT_IMPLEMENTED)
        
        if not os.getenv("PERPLEXITY_API_KEY") or os.getenv("PERPLEXITY_API_KEY") == "your_perplexity_api_key_here":
            return Response({
                "error": "PERPLEXITY_API_KEY not configured. Please add your API key to the .env file.",
                "setup_instructions": "Get your Perplexity API key from https://www.perplexity.ai/settings/api"
            }, status=status.HTTP_501_NOT_IMPLEMENTED)
        
        from candidates.ml_models.questions import get_questions
        questions = get_questions(resume_file, HR_prompt, company, role)
        return Response({"questions": questions}, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"Error generating questions: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
