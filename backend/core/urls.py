from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

# A tiny view just to test the home page
def home_view(request):
    return HttpResponse("<h1>Backend is running!</h1><p>Check <a href='/admin/'>/admin/</a> or <a href='/api/hello/'>/api/hello/</a></p>")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home_view), 
    # Remove the # and make sure 'api.urls' matches your app folder name
    path('api/', include('api.urls')), 
]