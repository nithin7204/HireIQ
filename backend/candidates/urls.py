from django.urls import path
from .views import (
    CandidateListCreateView, 
    validate_candidate_id, 
    download_resume, 
    ResumeUploadView, 
    auto_generate_questions,
    get_candidate_questions,
    transcribe_audio_view,
    save_audio_response,
    manual_evaluate_candidate,
    get_detailed_report
)

urlpatterns = [
    path('', CandidateListCreateView.as_view(), name='candidate-list-create'),
    path('validate/', validate_candidate_id, name='validate-candidate-id'),
    path('upload-resume/', ResumeUploadView.as_view(), name='upload-resume'),
    path('download-resume/<str:candidate_id>/', download_resume, name='download-resume'),
    path('auto-generate-questions/', auto_generate_questions, name='auto-generate-questions'),
    path('questions/<str:candidate_id>/', get_candidate_questions, name='get-candidate-questions'),
    path('transcribe-audio/', transcribe_audio_view, name='transcribe-audio'),
    path('save-audio-response/', save_audio_response, name='save-audio-response'),
    path('manual-evaluate/', manual_evaluate_candidate, name='manual-evaluate-candidate'),
    path('detailed-report/<str:candidate_id>/', get_detailed_report, name='detailed-report'),
]