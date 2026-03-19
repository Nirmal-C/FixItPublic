from django.urls import path, include
from django.http import HttpResponse


def home_view(request):
    return HttpResponse(
        "<h1>FixItPublic Backend</h1>"
        "<ul>"
        "<li><a href='/api/auth/register/'>POST /api/auth/register/</a></li>"
        "<li><a href='/api/auth/token/'>POST /api/auth/token/</a></li>"
        "<li><a href='/api/requests/'>GET /api/requests/</a></li>"
        "<li><a href='/api/health/'>GET /api/health/</a></li>"
        "</ul>"
    )


urlpatterns = [
    path('',    home_view),
    path('api/', include('api.urls')),
]
