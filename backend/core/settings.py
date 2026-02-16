import os
STATIC_URL = 'static/'

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-development-key-123')

DEBUG = os.environ.get('DEBUG') == '1'


# ALLOWED_HOSTS = ['20.203.82.12', 'localhost', '127.0.0.1', '10.244.0.0/16']
ALLOWED_HOSTS = ['*']

ROOT_URLCONF = 'core.urls'

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
if os.environ.get('DB_SSL') == 'True':
    DATABASES['default']['OPTIONS'] = {
        'sslmode': 'verify-full',
        'sslrootcert': '/app/certs/root.crt',
    }

INSTALLED_APPS = [
    'django.contrib.admin',     
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
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

CORS_ALLOW_ALL_ORIGINS = True

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