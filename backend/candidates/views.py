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
from datetime import datetime
import os
import uuid
from datetime import datetime
from .models import Candidate
from .serializers import CandidateSerializer, CandidateCreateSerializer
from candidates.ml_models.voiceToText import transcribe_audio
from candidates.ml_models.evaluate import evaluate_candidate_answer as eval_function

class CandidateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CandidateCreateSerializer
        return CandidateSerializer
    
    def get_queryset(self):
        try:
            user_id = str(self.request.user.id)
            
            # Get candidates created by the current user
            candidates = Candidate.objects.filter(created_by_id=user_id)
            
            return candidates
        except Exception as e:
            return []
    
    def list(self, request, *args, **kwargs):
        try:
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            queryset = self.get_queryset()
            
            # Disable auto-evaluation during list to prevent inconsistencies during debugging
            
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
                # Check if this recruiter has already invited this candidate
                user_id = str(request.user.id)
                candidate_email = serializer.validated_data['email']
                
                existing_candidate = Candidate.objects.filter(
                    email=candidate_email,
                    created_by_id=user_id
                ).first()
                
                if existing_candidate:
                    return Response(
                        {'error': f'You have already invited candidate "{candidate_email}". Please check your candidates list.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                candidate = serializer.save()
                
                # Send email to candidate with their ID
                subject = 'Your HireIQ Candidate ID'
                message = f'''
Dear Candidate,

You have been invited to participate in the HireIQ interview process.

Your Candidate ID is: {candidate.candidate_id}

Please use this ID to access the interview portal at: http://localhost:3000/candidate

Best regards,
HireIQ Team
                '''
                
                try:
                    result = send_mail(
                        subject,
                        message,
                        settings.EMAIL_HOST_USER,
                        [candidate.email],
                        fail_silently=False,
                    )
                except Exception as e:
                    # Log the error but don't fail the creation
                    pass  # Email failure shouldn't prevent candidate creation
                
                return Response(
                    CandidateSerializer(candidate).data, 
                    status=status.HTTP_201_CREATED
                )
            except ValidationError as e:
                error_message = str(e)
                return Response(
                    {'error': f'Validation error: {error_message}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                error_message = str(e)
                return Response(
                    {'error': f'Failed to create candidate: {error_message}'}, 
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

@api_view(['GET'])
@permission_classes([])
def get_candidate_questions(request, candidate_id):
    """
    Get saved questions for a candidate.
    """
    try:
        candidate = Candidate.objects.get(candidate_id=candidate_id, is_active=True)
        
        if not candidate.interview_questions:
            return Response(
                {'error': 'No questions found for this candidate'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            "questions": candidate.interview_questions,
            "candidate": CandidateSerializer(candidate).data
        }, status=status.HTTP_200_OK)
        
    except DoesNotExist:
        return Response(
            {'error': 'Invalid candidate ID'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to get questions: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([])
def auto_generate_questions(request):
    """
    Automatically generate interview questions for a candidate when they start the interview.
    This endpoint creates questions with AI role-playing as a professional SDE interviewer.
    Expects POST data:
    - candidate_id: Candidate ID
    """
    candidate_id = request.data.get("candidate_id")
    
    if not candidate_id:
        return Response({"error": "Candidate ID is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get candidate
        candidate = Candidate.objects.get(candidate_id=candidate_id, is_active=True)
        
        if not candidate.resume_data:
            return Response(
                {'error': 'No resume found for this candidate'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if questions already exist
        if candidate.interview_questions and len(candidate.interview_questions) > 0:
            return Response({
                "questions": candidate.interview_questions,
                "hr_instructions": candidate.hr_prompt or get_default_sde_instructions(),
                "candidate": CandidateSerializer(candidate).data
            }, status=status.HTTP_200_OK)
        
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
        
        # Set up interview parameters - use stored HR prompt if available
        company = "TechCorp"
        role = "Software Development Engineer (SDE)"
        
        # Use the stored HR prompt if available, otherwise fall back to default SDE instructions
        hr_instructions = candidate.hr_prompt if candidate.hr_prompt and candidate.hr_prompt.strip() else get_default_sde_instructions()
        
        # Create a file-like object from binary data
        import io
        resume_file = io.BytesIO(candidate.resume_data)
        resume_file.name = candidate.resume_filename or f"{candidate_id}_resume.pdf"
        
        from candidates.ml_models.questions import get_questions
        questions = get_questions(resume_file, hr_instructions, company, role)
        
        # Save questions and interview setup to candidate record
        candidate.company = company
        candidate.role = role
        # Only update hr_prompt if it wasn't already set during candidate creation
        if not candidate.hr_prompt or not candidate.hr_prompt.strip():
            candidate.hr_prompt = hr_instructions
        candidate.interview_questions = questions
        candidate.save()
        
        return Response({
            "questions": questions,
            "hr_instructions": hr_instructions,
            "candidate": CandidateSerializer(candidate).data
        }, status=status.HTTP_200_OK)
        
    except DoesNotExist:
        return Response(
            {'error': 'Invalid candidate ID'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        import traceback
        print(f"Error auto-generating questions: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def get_default_sde_instructions():
    """
    Returns the standard SDE interview instructions and format.
    """
    return """
Hello! I'm your AI interviewer for the Software Development Engineer position. 

INTERVIEW INSTRUCTIONS:
• This interview will last approximately 45-60 minutes
• We'll cover both technical and behavioral questions
• For technical questions, explain your thought process clearly
• You can ask clarifying questions if needed
• Take your time to think through problems systematically
• We value problem-solving approach over perfect solutions

INTERVIEW STRUCTURE:
1. Brief introduction and warm-up questions (5 minutes)
2. Technical coding/system design questions (30-40 minutes)
3. Behavioral questions about experience and teamwork (10-15 minutes)
4. Questions for me about the role/team (5 minutes)

EVALUATION CRITERIA:
• Problem-solving and analytical thinking
• Coding skills and technical knowledge
• Communication and collaboration abilities
• Leadership and impact potential
• Cultural fit with our team values

Remember: We're looking for your thought process, not just the right answer. Good luck!
"""

def check_and_auto_evaluate(candidate):
    """
    Check if the candidate has completed the interview and automatically trigger evaluation if needed.
    Returns True if interview is completed, False otherwise.
    """
    try:
        # Check if candidate has interview questions
        if not candidate.interview_questions:
            return False
        
        # Get the number of questions from interview_questions
        total_questions = len(candidate.interview_questions)
        
        # Get the number of audio responses
        response_count = len(candidate.audio_responses) if candidate.audio_responses else 0
        
        # Check if all questions have been answered
        interview_completed = response_count >= total_questions
        
        # If interview is completed and no evaluation score exists, trigger auto-evaluation
        if interview_completed and not candidate.evaluation_score:
            try:
                # Trigger evaluation in the background
                from threading import Thread
                thread = Thread(target=auto_evaluate_candidate, args=(candidate.candidate_id,))
                thread.daemon = True
                thread.start()
                print(f"Auto-evaluation triggered for candidate {candidate.candidate_id}")
            except Exception as e:
                print(f"Failed to trigger auto-evaluation for candidate {candidate.candidate_id}: {str(e)}")
        
        return interview_completed
        
    except Exception as e:
        print(f"Error in check_and_auto_evaluate: {str(e)}")
        return False

def auto_evaluate_candidate(candidate_id):
    """
    Background function to automatically evaluate a candidate.
    """
    try:
        from .ml_models.evaluate import evaluate_candidate_answer as eval_function
        from .gridfs_models import get_resume_content
        from datetime import datetime
        
        # Get candidate
        candidate = Candidate.objects.get(candidate_id=candidate_id)
        
        # Get resume content
        resume_content = get_resume_content(candidate_id)
        if not resume_content:
            print(f"No resume found for candidate {candidate_id} - skipping auto-evaluation")
            return
        
        # Prepare evaluations from audio responses
        evaluations = []
        if candidate.audio_responses and candidate.interview_questions:
            # Convert interview_questions dict to list for easier processing
            questions_list = list(candidate.interview_questions.items())
            
            for response in candidate.audio_responses:
                question_text = response.get('question_text', '')
                transcription = response.get('transcription', '')
                
                if question_text and transcription:
                    evaluations.append({
                        'question': question_text,
                        'answer': transcription
                    })
        
        if not evaluations:
            print(f"No valid question-answer pairs found for candidate {candidate_id}")
            # Don't create fake scores - candidate needs to complete proper interview first
            return
        
        # Process evaluations
        total_score = 0
        successful_evaluations = 0
        evaluation_results = []
        
        for evaluation in evaluations:
            question = evaluation['question']
            answer = evaluation['answer']
            
            try:
                evaluation_result = eval_function(question, answer, resume_content)
                
                if not evaluation_result.get('error'):
                    total_score += evaluation_result.get('overall_score', 0)
                    successful_evaluations += 1
                    evaluation_results.append(evaluation_result)
                else:
                    print(f"Evaluation error for candidate {candidate_id}: {evaluation_result.get('message', 'Unknown error')}")
                
            except Exception as e:
                print(f"Failed to evaluate question for candidate {candidate_id}: {str(e)}")
        
        # Calculate and save results if we have successful evaluations
        if successful_evaluations > 0:
            average_score = total_score / successful_evaluations
            
            # Determine rating based on average score
            if average_score >= 8:
                rating = 'Excellent'
            elif average_score >= 6:
                rating = 'Good'
            elif average_score >= 4:
                rating = 'Average'
            else:
                rating = 'Needs Improvement'
            
            # Update candidate with evaluation results
            candidate.evaluation_score = str(round(average_score, 1))
            candidate.evaluation_rating = rating
            candidate.evaluation_data = {
                'total_questions': len(evaluations),
                'successful_evaluations': successful_evaluations,
                'failed_evaluations': len(evaluations) - successful_evaluations,
                'average_score': round(average_score, 2),
                'overall_rating': rating,
                'evaluation_results': evaluation_results,
                'auto_generated': True,
                'evaluation_timestamp': datetime.utcnow().isoformat()
            }
            candidate.evaluation_timestamp = datetime.utcnow()
            candidate.save()
            
            print(f"Auto-evaluation completed for candidate {candidate_id}: {average_score:.1f}/10 ({rating})")
        else:
            print(f"No successful evaluations for candidate {candidate_id}")
            
    except Exception as e:
        print(f"Error in auto_evaluate_candidate for {candidate_id}: {str(e)}")
        import traceback
        traceback.print_exc()

@api_view(['POST'])
@permission_classes([])
def transcribe_audio_view(request):
    """
    Accepts an uploaded audio file and returns its transcription.
    Expects the audio file in request.FILES['audio'].
    Optional: service parameter ('gemini', 'openai', 'google') - defaults to 'gemini'
    Note: Gemini has automatic fallback to OpenAI if rate limits are hit.
    """
    audio_file = request.FILES.get('audio')
    service = request.data.get('service', 'gemini')  # Changed back to Gemini default
    
    if not audio_file:
        return Response({'error': 'Audio file is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    print(f"DEBUG: Using transcription service: {service}")
    print(f"DEBUG: Audio file: {audio_file.name}, Size: {audio_file.size} bytes")
    
    try:
        print(f"DEBUG: About to call transcribe_audio with service: {service}")
        text = transcribe_audio(audio_file, service=service)
        print(f"DEBUG: Transcription completed successfully, length: {len(text) if text else 0}")
        return Response({
            'transcription': text,
            'service_used': service,
            'audio_filename': audio_file.name,
            'audio_size_bytes': audio_file.size,
            'message': 'Transcription successful'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print(f"Transcription error with {service}: {str(e)}")
        traceback.print_exc()
        
        # Provide helpful error message for rate limits
        if "rate limit" in str(e).lower() or "quota" in str(e).lower() or "429" in str(e):
            return Response({
                'error': f'{service.title()} API rate limit exceeded. Try again later or use a different service.',
                'service_attempted': service,
                'suggestion': 'Try using "openai" service instead',
                'rate_limit': True
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        else:
            return Response({
                'error': f'{service.title()} transcription failed: {str(e)}',
                'service_attempted': service
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([])
def save_audio_response(request):
    """
    Save audio response for a candidate.
    """
    try:
        candidate_id = request.data.get("candidate_id")
        question_id = request.data.get("question_id")
        question_text = request.data.get("question_text")
        audio_data = request.data.get("audio_data")
        transcription = request.data.get("transcription")
        duration = request.data.get("duration")

        if not all([candidate_id, question_id, question_text]):
            return Response(
                {"error": "Missing required fields: candidate_id, question_id, question_text"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find candidate
        candidate = Candidate.objects.get(candidate_id=candidate_id, is_active=True)
        
        # Initialize audio_responses if it doesn't exist
        if not candidate.audio_responses:
            candidate.audio_responses = []
        
        response_data = {
            "question_id": question_id,
            "question_text": question_text,
            "audio_data": audio_data,
            "transcription": transcription or "",
            "duration": duration or 0,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Check if response already exists for this question and update it
        existing_index = None
        for i, response in enumerate(candidate.audio_responses):
            if response.get("question_id") == question_id:
                existing_index = i
                break
        
        if existing_index is not None:
            candidate.audio_responses[existing_index] = response_data
        else:
            candidate.audio_responses.append(response_data)
        
        candidate.save()
        
        # Check if interview is completed and trigger auto-evaluation if needed
        try:
            check_and_auto_evaluate(candidate)
        except Exception as e:
            print(f"Error checking auto-evaluation for candidate {candidate_id}: {str(e)}")
        
        return Response({
            "message": "Audio response saved successfully",
            "response_count": len(candidate.audio_responses)
        }, status=status.HTTP_200_OK)
        
    except Candidate.DoesNotExist:
        return Response(
            {'error': 'Invalid candidate ID'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to save audio response: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manual_evaluate_candidate(request):
    """
    Manually trigger evaluation for a candidate.
    Used by recruiters to force evaluation when auto-evaluation fails.
    """
    try:
        candidate_id = request.data.get('candidate_id')
        if not candidate_id:
            return Response(
                {'error': 'candidate_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if candidate exists
        try:
            candidate = Candidate.objects.get(candidate_id=candidate_id, is_active=True)
        except Candidate.DoesNotExist:
            return Response(
                {'error': 'Candidate not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if candidate has completed interview
        if not candidate.interview_questions:
            return Response(
                {'error': 'Candidate has no interview questions'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not candidate.audio_responses:
            return Response(
                {'error': 'Candidate has no audio responses'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        total_questions = len(candidate.interview_questions)
        response_count = len(candidate.audio_responses)
        
        if response_count < total_questions:
            return Response(
                {'error': f'Interview not completed. {response_count}/{total_questions} questions answered'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Trigger evaluation
        try:
            from threading import Thread
            thread = Thread(target=auto_evaluate_candidate, args=(candidate_id,))
            thread.daemon = True
            thread.start()
            
            return Response({
                'message': 'Evaluation triggered successfully',
                'candidate_id': candidate_id,
                'questions_count': total_questions,
                'responses_count': response_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to trigger evaluation: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        return Response(
            {'error': f'Manual evaluation failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([])
def fetch_candidate_evaluation(request):
    """
    Fetch evaluation results for a candidate from their audio responses and store them.
    
    Expects POST data:
    - candidate_id: ID of the candidate (required)
    
    Returns:
    - evaluation_summary: Overall evaluation summary with scores and rating
    """
    try:
        from .gridfs_models import get_resume_content
        from .ml_models.evaluate import evaluate_candidate_answer as eval_function
        from datetime import datetime
        
        # Get request data
        data = request.data
        candidate_id = data.get('candidate_id', '').strip()
        
        # Validate required fields
        if not candidate_id:
            return Response(
                {'error': 'Candidate ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            candidate = Candidate.objects.get(candidate_id=candidate_id, is_active=True)
        except DoesNotExist:
            return Response(
                {'error': 'Invalid candidate ID'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if candidate has audio responses
        if not candidate.audio_responses:
            return Response(
                {'error': 'No interview responses found for this candidate'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get candidate resume
        try:
            resume_content = get_resume_content(candidate_id)
            if not resume_content:
                return Response(
                    {'error': 'Resume not found for this candidate'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': 'Could not retrieve candidate resume'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prepare evaluations from audio responses
        evaluations = []
        for response in candidate.audio_responses:
            question = response.get('question_text', '')
            answer = response.get('transcription', '')
            
            if question and answer:
                evaluations.append({
                    'question': question,
                    'answer': answer
                })
        
        if not evaluations:
            return Response(
                {'error': 'No valid question-answer pairs found in interview responses'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process evaluations
        results = []
        total_score = 0
        successful_evaluations = 0
        
        for idx, evaluation in enumerate(evaluations):
            question = evaluation['question']
            answer = evaluation['answer']
            
            try:
                evaluation_result = eval_function(question, answer, resume_content)
                
                if not evaluation_result.get('error'):
                    total_score += evaluation_result.get('overall_score', 0)
                    successful_evaluations += 1
                
                results.append({
                    'index': idx,
                    'question': question[:100] + '...' if len(question) > 100 else question,
                    'evaluation': evaluation_result
                })
                
            except Exception as e:
                results.append({
                    'index': idx,
                    'error': f'Evaluation failed: {str(e)}',
                    'question': question[:50] + '...' if len(question) > 50 else question
                })
        
        # Calculate summary
        average_score = total_score / successful_evaluations if successful_evaluations > 0 else 0
        
        # Determine rating based on average score
        if average_score >= 8:
            overall_rating = 'Excellent'
        elif average_score >= 6:
            overall_rating = 'Good'
        elif average_score >= 4:
            overall_rating = 'Average'
        else:
            overall_rating = 'Needs Improvement'
        
        summary = {
            'total_questions': len(evaluations),
            'successful_evaluations': successful_evaluations,
            'failed_evaluations': len(evaluations) - successful_evaluations,
            'average_score': round(average_score, 2),
            'overall_rating': overall_rating
        }
        
        # Save evaluation results to candidate
        candidate.evaluation_score = str(round(average_score, 2))
        candidate.evaluation_rating = overall_rating
        candidate.evaluation_data = {
            'summary': summary,
            'results': results,
            'evaluated_at': datetime.utcnow().isoformat()
        }
        candidate.evaluation_timestamp = datetime.utcnow()
        candidate.save()
        
        return Response({
            'success': True,
            'candidate_id': candidate_id,
            'evaluation_summary': summary,
            'candidate': CandidateSerializer(candidate).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Unexpected error in fetch_candidate_evaluation: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Server error: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manual_evaluate_candidate(request):
    """
    Manually trigger evaluation for a candidate.
    
    Expects POST data:
    - candidate_id: ID of the candidate (required)
    
    Returns:
    - evaluation_summary: Overall evaluation summary with scores and rating
    """
    try:
        from .gridfs_models import get_resume_content
        from .ml_models.evaluate import evaluate_candidate_answer as eval_function
        from datetime import datetime
        
        # Get request data
        data = request.data
        candidate_id = data.get('candidate_id', '').strip()
        
        print(f"🔧 MANUAL EVALUATION REQUEST")
        print(f"   User: {request.user.email if hasattr(request.user, 'email') else request.user.username}")
        print(f"   Candidate ID: {candidate_id}")
        
        # Validate required fields
        if not candidate_id:
            return Response(
                {'error': 'Candidate ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            candidate = Candidate.objects.get(candidate_id=candidate_id, is_active=True)
            
            print(f"   📋 Found candidate: {candidate.email}")
            print(f"   📊 Current Score: {candidate.evaluation_score}")
            print(f"   ⭐ Current Rating: {candidate.evaluation_rating}")
            
            # Check if candidate belongs to the current user
            if candidate.created_by_id != str(request.user.id):
                return Response(
                    {'error': 'You can only evaluate your own candidates'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
                
        except DoesNotExist:
            return Response(
                {'error': 'Invalid candidate ID'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if candidate has audio responses
        if not candidate.audio_responses:
            print(f"   ❌ No audio responses found")
            return Response(
                {'error': 'No interview responses found for this candidate'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        print(f"   🎤 Audio responses found: {len(candidate.audio_responses)}")
        
        # Get candidate resume
        try:
            resume_content = get_resume_content(candidate_id)
            if not resume_content:
                print(f"   ❌ No resume content found")
                return Response(
                    {'error': 'Resume not found for this candidate'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            print(f"   📄 Resume content found: {len(resume_content)} characters")
        except Exception as e:
            print(f"   ❌ Resume retrieval error: {e}")
            return Response(
                {'error': 'Could not retrieve candidate resume'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check for valid transcriptions first
        valid_transcriptions = []
        print(f"   🔍 Checking transcriptions...")
        for i, response in enumerate(candidate.audio_responses):
            question = response.get('question_text', '').strip()
            transcription = response.get('transcription', '').strip()
            
            print(f"      Response {i+1}: Q={len(question)} chars, T={len(transcription)} chars")
            
            if question and transcription:
                valid_transcriptions.append({
                    'question': question,
                    'answer': transcription
                })
        
        print(f"   ✅ Valid transcriptions: {len(valid_transcriptions)}")
        
        # If no valid transcriptions, don't create fake scores
        if not valid_transcriptions:
            print(f"   ❌ No valid transcriptions found - candidate needs to complete proper interview")
            return Response(
                {
                    'error': 'No valid interview responses found',
                    'message': 'Candidate needs to complete interview with proper transcriptions to get evaluation'
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"   🧠 Processing AI-based evaluation with {len(valid_transcriptions)} Q&A pairs...")
        
        # Process evaluations with valid transcriptions
        results = []
        total_score = 0
        successful_evaluations = 0
        
        for idx, evaluation in enumerate(valid_transcriptions):
            question = evaluation['question']
            answer = evaluation['answer']
            
            print(f"   📝 Evaluating Q&A {idx+1}/{len(valid_transcriptions)}")
            
            try:
                evaluation_result = eval_function(question, answer, resume_content)
                
                if not evaluation_result.get('error'):
                    score = evaluation_result.get('overall_score', 0)
                    total_score += score
                    successful_evaluations += 1
                    print(f"      ✅ Score: {score}")
                else:
                    print(f"      ❌ Evaluation error: {evaluation_result.get('error')}")
                
                results.append({
                    'index': idx,
                    'question': question[:100] + '...' if len(question) > 100 else question,
                    'evaluation': evaluation_result
                })
                
            except Exception as e:
                print(f"      ❌ Exception during evaluation: {e}")
                results.append({
                    'index': idx,
                    'error': f'Evaluation failed: {str(e)}',
                    'question': question[:50] + '...' if len(question) > 50 else question
                })
        
        # Calculate summary
        average_score = total_score / successful_evaluations if successful_evaluations > 0 else 0
        
        print(f"   📊 Final Results:")
        print(f"      Total Score: {total_score}")
        print(f"      Successful Evaluations: {successful_evaluations}")
        print(f"      Average Score: {average_score}")
        
        # Determine rating based on average score
        if average_score >= 8:
            overall_rating = 'Excellent'
        elif average_score >= 6:
            overall_rating = 'Good'
        elif average_score >= 4:
            overall_rating = 'Average'
        else:
            overall_rating = 'Needs Improvement'
        
        print(f"      Overall Rating: {overall_rating}")
        
        summary = {
            'total_questions': len(candidate.audio_responses),
            'transcribed_questions': len(valid_transcriptions),
            'successful_evaluations': successful_evaluations,
            'failed_evaluations': len(valid_transcriptions) - successful_evaluations,
            'average_score': round(average_score, 2),
            'overall_rating': overall_rating
        }
        
        # Save evaluation results to candidate
        candidate.evaluation_score = str(round(average_score, 2))
        candidate.evaluation_rating = overall_rating
        candidate.evaluation_data = {
            'summary': summary,
            'results': results,
            'evaluated_at': datetime.utcnow().isoformat(),
            'evaluation_type': 'ai_based'
        }
        candidate.evaluation_timestamp = datetime.utcnow()
        candidate.save()
        
        return Response({
            'success': True,
            'candidate_id': candidate_id,
            'evaluation_summary': summary,
            'candidate': CandidateSerializer(candidate).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Unexpected error in manual_evaluate_candidate: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Server error: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )