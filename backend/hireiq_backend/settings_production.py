# Production settings override for Docker deployment
import os
from .settings import *

# Override settings for production
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# Security settings
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() == 'true'
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '0'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False').lower() == 'true'
SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'False').lower() == 'true'

# Session security
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False').lower() == 'true'

# Allowed hosts from environment
ALLOWED_HOSTS = [host.strip() for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')]

# Static and media files for production
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# CORS settings for production
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'True').lower() == 'true'  # Allow all for now
CORS_ALLOW_CREDENTIALS = True  # Required for authentication

# CORS allowed origins from environment or computed from ALLOWED_HOSTS
cors_origins_env = os.getenv('CORS_ALLOWED_ORIGINS', '')
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_env.split(',')]
else:
    CORS_ALLOWED_ORIGINS = [
        f"http://{host}" for host in ALLOWED_HOSTS if host not in ['localhost', '127.0.0.1']
    ] + [
        f"https://{host}" for host in ALLOWED_HOSTS if host not in ['localhost', '127.0.0.1']
    ] + [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com",
        "http://ec2-65-1-248-45.ap-south-1.compute.amazonaws.com:80",
    ]

# Add HTTPS origins if SSL is enabled
if SECURE_SSL_REDIRECT:
    CORS_ALLOWED_ORIGINS.extend([
        f"https://{host}" for host in ALLOWED_HOSTS
    ])

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()

# Additional CORS settings for better compatibility
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://accounts\.google\.com$",
    r"^https://.*\.googleusercontent\.com$",
]

# Enhanced CORS headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'cross-origin-opener-policy',
    'cache-control',
    'access-control-allow-credentials',
    'access-control-allow-origin',
]

CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
]

# Additional settings to handle preflight requests
CORS_PREFLIGHT_MAX_AGE = 86400

# Database connection with environment variables
MONGODB_URL = os.getenv('MONGODB_URL')
MONGODB_NAME = os.getenv('MONGODB_NAME', 'hireiq_db')

# Google OAuth2 Settings for production
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.getenv('GOOGLE_OAUTH2_KEY') or os.getenv('GOOGLE_CLIENT_ID')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.getenv('GOOGLE_OAUTH2_SECRET') or os.getenv('GOOGLE_CLIENT_SECRET')

# Update redirect URLs for EC2 deployment
SOCIAL_AUTH_LOGIN_REDIRECT_URL = '/'
SOCIAL_AUTH_LOGIN_ERROR_URL = '/login'
SOCIAL_AUTH_LOGIN_URL = '/auth/login/google-oauth2/'

# Ensure proper authentication backends
AUTHENTICATION_BACKENDS = [
    'social_core.backends.google.GoogleOAuth2',
    'django.contrib.auth.backends.ModelBackend',
]

# Social auth settings for better security
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ['email', 'profile']
SOCIAL_AUTH_GOOGLE_OAUTH2_USE_DEPRECATED_API = False
SOCIAL_AUTH_RAISE_EXCEPTIONS = False
SOCIAL_AUTH_REDIRECT_IS_HTTPS = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() == 'true'

# Redis cache configuration
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Session storage
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Logging configuration - Console only for Docker
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
