from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.http import JsonResponse
import json
import base64

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def google_auth(request):
    try:
        data = json.loads(request.body)
        token = data.get('token')
        
        print(f"Received token: {token[:50]}..." if token else "No token received")
        
        if not token:
            return Response(
                {'error': 'Token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode the JWT token to get user info (basic decoding)
            # In production, you should verify the token signature
            parts = token.split('.')
            if len(parts) != 3:
                print(f"Invalid token format: {len(parts)} parts")
                raise ValueError("Invalid token format")
            
            # Decode the payload (second part)
            payload = parts[1]
            # Add padding if needed
            missing_padding = len(payload) % 4
            if missing_padding:
                payload += '=' * (4 - missing_padding)
            
            print(f"Decoding payload: {payload[:50]}...")
            decoded_bytes = base64.urlsafe_b64decode(payload)
            user_info = json.loads(decoded_bytes.decode('utf-8'))
            
            print(f"Decoded user info: {user_info}")
            
            email = user_info.get('email')
            name = user_info.get('name', '')
            
            if not email:
                print("No email found in token")
                return Response(
                    {'error': 'Email not found in token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            print(f"Creating/getting user for email: {email}")
            
            # Get or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': name.split(' ')[0] if name else '',
                    'last_name': ' '.join(name.split(' ')[1:]) if name and len(name.split(' ')) > 1 else '',
                }
            )
            
            print(f"User {'created' if created else 'found'}: {user.email}")
            
            # Update user info if it already exists
            if not created and name:
                user.first_name = name.split(' ')[0] if name else user.first_name
                user.last_name = ' '.join(name.split(' ')[1:]) if name and len(name.split(' ')) > 1 else user.last_name
                user.save()
            
            # Log the user in - specify the backend since we have multiple backends
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)
            print(f"User logged in successfully: {user.email}")
            
            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip() or email,
                }
            }, status=status.HTTP_200_OK)
            
        except (ValueError, json.JSONDecodeError) as e:
            print(f"Token decoding error: {str(e)}")
            # Invalid token
            return Response(
                {'error': f'Invalid Google token: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return Response(
            {'error': 'Invalid JSON'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Server error: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'success': True}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def user_info(request):
    if request.user.is_authenticated:
        return Response({
            'authenticated': True,
            'user': {
                'id': request.user.id,
                'email': request.user.email,
                'name': f"{request.user.first_name} {request.user.last_name}".strip(),
            }
        })
    else:
        return Response({'authenticated': False})

@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    return JsonResponse({'csrftoken': 'set'})
