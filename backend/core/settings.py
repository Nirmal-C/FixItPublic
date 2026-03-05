import os
from pathlib import Path

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# --- 1. Security Settings ---
# Pulls from K8s Secret (app-secrets)
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-local-dev-key')

# DEBUG is True locally, False in Kubernetes
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# --- 2. Application Definition ---
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Required for Cloud & API
    'storages',      # django-storages[azure]
    'rest_framework',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # Best for static files in Docker
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# --- 3. Database Configuration ---
# Uses PostgreSQL with SSL for Azure Flexible Server
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASS'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
        }
    }
}

# --- 4. Static & Media Files ---
# Static files use WhiteNoise for performance in K8s
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media Files: Toggle between Local (Dev) and Azure (Prod)
if not DEBUG:
    # Use Azure Blob Storage for User Uploads
    DEFAULT_FILE_STORAGE = 'storages.backends.azure_storage.AzureStorage'
    
    AZURE_ACCOUNT_NAME = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME')
    AZURE_ACCOUNT_KEY = os.environ.get('AZURE_STORAGE_ACCOUNT_KEY')
    AZURE_CONTAINER = 'maintenance-photos'
    
    # Ensure URLs don't expire since your container is set to 'Blob' access
    AZURE_URL_EXPIRATION_SECS = None
    
    # The public URL for images
    AZURE_CUSTOM_DOMAIN = f'{AZURE_ACCOUNT_NAME}.blob.core.windows.net'
    MEDIA_URL = f'https://{AZURE_CUSTOM_DOMAIN}/{AZURE_CONTAINER}/'
else:
    # Local fallback
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# --- 5. CORS & Security ---
CORS_ALLOW_ALL_ORIGINS = True  # Fine for group projects; restrict in production

# --- 6. Misc ---
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'