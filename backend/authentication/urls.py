from django.urls import path
from .views import google_auth, logout_view, user_info, get_csrf_token

urlpatterns = [
    path('google/', google_auth, name='google-auth'),
    path('logout/', logout_view, name='logout'),
    path('user/', user_info, name='user-info'),
    path('csrf/', get_csrf_token, name='csrf-token'),
]
