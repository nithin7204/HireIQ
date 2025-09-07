from django.urls import path
from .views import (
    CandidateListCreateView, 
    validate_candidate_id, 
    upload_resume, 
    download_resume, 
    ResumeUploadView, 
    generate_interview_questions,
    generate_candidate_questions,
    auto_generate_questions,
    get_candidate_questions,
    save_audio_response,
    get_candidate_responses,
    transcribe_audio_view,
    evaluate_candidate_answer,
    batch_evaluate_answers,
    fetch_candidate_evaluation
)

urlpatterns = [
    path('', CandidateListCreateView.as_view(), name='candidate-list-create'),
    path('validate/', validate_candidate_id, name='validate-candidate-id'),
    path('upload-resume/', ResumeUploadView.as_view(), name='upload-resume'),
    path('download-resume/<str:candidate_id>/', download_resume, name='download-resume'),
    path('generate-questions/', generate_interview_questions, name='generate-interview-questions'),
    path('generate-candidate-questions/', generate_candidate_questions, name='generate-candidate-questions'),
    path('auto-generate-questions/', auto_generate_questions, name='auto-generate-questions'),
    path('questions/<str:candidate_id>/', get_candidate_questions, name='get-candidate-questions'),
    path('save-audio-response/', save_audio_response, name='save-audio-response'),
    path('responses/<str:candidate_id>/', get_candidate_responses, name='get-candidate-responses'),
    path('transcribe-audio/', transcribe_audio_view, name='transcribe-audio'),
    path('evaluate-answer/', evaluate_candidate_answer, name='evaluate-candidate-answer'),
    path('batch-evaluate/', batch_evaluate_answers, name='batch-evaluate-answers'),
    path('fetch-evaluation/', fetch_candidate_evaluation, name='fetch-candidate-evaluation'),
]