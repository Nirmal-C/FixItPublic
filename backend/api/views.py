from django.http import JsonResponse
from django.db import connection
from django.core.files.storage import default_storage

def hello_world(request):
    return JsonResponse({"message": "Hello from the Django Backend!"})

def health_check(request):
    status_data = {
        "status": "online",
        "database": "disconnected",
        "storage": "disconnected",
        "message": ""
    }
    
    # 1. Check Database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        status_data["database"] = "connected"
    except Exception as e:
        status_data["message"] += f"DB Error: {str(e)}. "

    # 2. Check Azure Blob Storage
    try:
        default_storage.listdir('')
        status_data["storage"] = "connected"
    except Exception as e:
        status_data["message"] += f"Storage Error: {str(e)}"

    # If both are connected, give a clean message
    if status_data["database"] == "connected" and status_data["storage"] == "connected":
        status_data["message"] = "Backend and all services are fully operational"

    return JsonResponse(status_data, status=200)