import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# 1. Security Settings
# Pulling from GitHub Secrets (via K8s)
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

# Set DEBUG to False in production for GPO3/Security compliance
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# 2. Database Configuration (No hardcoded credentials)
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

# 3. Custom User Model (CRITICAL for FixITPublic)
# This points to the User class in your api/models.py
AUTH_USER_MODEL = 'api.User'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',      # For the Maintenance API
    'corsheaders',         # For React communication
    'api',                 # Your app
    'storages',            # For Azure Blob Storage
]

# 4. Media Storage (Azure Blob Storage for Facility Photos)
if not DEBUG:
    # Production settings for Azure
    DEFAULT_FILE_STORAGE = 'storages.backends.azure_storage.AzureStorage'
    AZURE_ACCOUNT_NAME = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME')
    AZURE_ACCOUNT_KEY = os.environ.get('AZURE_STORAGE_ACCOUNT_KEY')
    AZURE_CONTAINER = 'maintenance-photos'
else:
    # Local development settings
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
