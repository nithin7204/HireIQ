from django.urls import path
from .views import CandidateListCreateView, validate_candidate_id, upload_resume, download_resume, ResumeUploadView

urlpatterns = [
    path('', CandidateListCreateView.as_view(), name='candidate-list-create'),
    path('validate/', validate_candidate_id, name='validate-candidate-id'),
    path('upload-resume/', ResumeUploadView.as_view(), name='upload-resume'),
    path('download-resume/<str:candidate_id>/', download_resume, name='download-resume'),
]
