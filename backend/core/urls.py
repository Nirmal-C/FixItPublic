from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

# A tiny view just to test the home page
def home_view(request):
    return HttpResponse("<h1>Backend is running!</h1><p>Check <a href='/admin/'>/admin/</a> or <a href='/api/hello/'>/api/hello/</a></p>")

urlpatterns = [
    # Django's built-in admin is moved to /django-admin/ to avoid clashing
    # with the React frontend's /admin route (our custom portal).
    path('django-admin/', admin.site.urls),
    path('', home_view),
    path('api/', include('api.urls')),
]