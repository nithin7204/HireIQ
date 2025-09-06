from django.urls import path
from .views import CandidateListCreateView, validate_candidate_id, upload_resume, download_resume

urlpatterns = [
    path('', CandidateListCreateView.as_view(), name='candidate-list-create'),
    path('validate/', validate_candidate_id, name='validate-candidate-id'),
    path('upload-resume/', upload_resume, name='upload-resume'),
    path('download-resume/<str:candidate_id>/', download_resume, name='download-resume'),
]
