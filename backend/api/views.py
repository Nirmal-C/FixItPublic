from django.http import JsonResponse
from django.db import connection

def hello_world(request):
    return JsonResponse({"message": "Hello from the Django Backend!"})

def health_check(request):
    try:
        # This executes a simple query to see if the DB is alive
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "healthy"}, status=200)
    except Exception as e:
        return JsonResponse({"status": "unhealthy", "error": str(e)}, status=503)