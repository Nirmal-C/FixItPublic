import os

# settings.py

# 1. The URL used to access static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'

# 2. A secret key for security (In production, use an environment variable!)
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-development-key-123')

# 1. Force DEBUG to be a real Boolean by comparing the string '1'
DEBUG = os.environ.get('DEBUG') == '1'

# 2. Allow all hosts during development to bypass the security check
ALLOWED_HOSTS = ['*']

# This tells Django where to find your main urls.py file
ROOT_URLCONF = 'core.urls'

# This tells Django how to run the web application
WSGI_APPLICATION = 'core.wsgi.application'

# 1. Base Database Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'postgres'),
        'USER': os.environ.get('DB_USER', 'db_admin'),
        'PASSWORD': os.environ.get('DB_PASS', 'NirmalRukshan9899'),
        'HOST': os.environ.get('DB_HOST', 'posgresql-db.postgres.database.azure.com'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# 2. Conditional SSL Configuration
# Only add 'OPTIONS' if we are connecting to Azure with SSL enabled
if os.environ.get('DB_SSL') == 'True':
    DATABASES['default']['OPTIONS'] = {
        'sslmode': 'verify-full',
        'sslrootcert': '/app/certs/root.crt',
    }

INSTALLED_APPS = [
    'django.contrib.admin',           # <--- Make sure this is here!
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    # ... your other apps like 'rest_framework' or 'api'
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]

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