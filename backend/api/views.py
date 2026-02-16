from django.http import JsonResponse
from django.db import connection

def hello_world(request):
    return JsonResponse({"message": "Hello from the Django Backend!"})

def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({
            "status": "online",
            "database": "connected",
            "message": "Backend is fully operational"
        }, status=200)
    except Exception as e:
        # We return 200 so the Pod stays "Ready" in K8s, 
        # but the JSON tells the React frontend the truth.
        return JsonResponse({
            "status": "online",
            "database": "disconnected",
            "message": "Backend is live, but Database is down"
        }, status=200)