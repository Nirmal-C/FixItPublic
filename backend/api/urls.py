from django.urls import path
from .views import health_check, hello_world

urlpatterns = [
    path('hello/', hello_world),
    path('api/health/', health_check, name='health_check'),
]