from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.cache import never_cache
import mongoengine
from django.conf import settings

@require_GET
@never_cache
def health_check(request):
    """
    Health check endpoint for load balancers and monitoring systems.
    """
    health_status = {
        'status': 'healthy',
        'services': {}
    }
    
    overall_healthy = True
    
    # Check MongoDB connection
    try:
        # Try to ping the database
        mongoengine.connection.get_connection().admin.command('ping')
        health_status['services']['mongodb'] = 'healthy'
    except Exception as e:
        health_status['services']['mongodb'] = f'unhealthy: {str(e)}'
        overall_healthy = False
    
    # Check if we're in debug mode (shouldn't be in production)
    if settings.DEBUG:
        health_status['services']['debug_mode'] = 'warning: debug is enabled'
    else:
        health_status['services']['debug_mode'] = 'healthy'
    
    # Overall status
    if not overall_healthy:
        health_status['status'] = 'unhealthy'
        return JsonResponse(health_status, status=503)
    
    return JsonResponse(health_status, status=200)
