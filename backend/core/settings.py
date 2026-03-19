import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# ── 1. Security ────────────────────────────────────────────────────────────────
SECRET_KEY    = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-local-dev-key')
DEBUG         = os.environ.get('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# ── 2. Custom user model ───────────────────────────────────────────────────────
AUTH_USER_MODEL = 'api.User'

# ── 3. Installed apps ──────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'storages',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
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
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ── 4. Database ────────────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     os.environ.get('DB_NAME'),
        'USER':     os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST':     os.environ.get('DB_HOST'),
        'PORT':     os.environ.get('DB_PORT', '5432'),
        'OPTIONS':  {
            'sslmode':     os.environ.get('DB_SSLMODE', 'require'),
            'sslrootcert': os.path.join(BASE_DIR, 'certs', 'root.crt'),
        },
    }
}

# ── 5. Static & media ──────────────────────────────────────────────────────────
STATIC_URL  = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.azure_storage.AzureStorage",
        "OPTIONS": {
            "account_name":    os.environ.get('AZURE_STORAGE_ACCOUNT_NAME'),
            "account_key":     os.environ.get('AZURE_STORAGE_ACCOUNT_KEY'),
            "azure_container": "maintenance-photos",
            "expiration_secs": 3600,
        },
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# ── 6. CORS ────────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True

# ── 7. DRF + SimpleJWT ────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 9,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon':          '120/hour',
        'user':          '600/hour',
        'ticket_create': '10/hour',
        'register':      '5/hour',
        'login':         '10/hour',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':    timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME':   timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':    True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES':        ('Bearer',),
    'TOKEN_OBTAIN_SERIALIZER':  'api.token_serializer.CustomTokenObtainPairSerializer',
}

# ── 8. Email (SMTP — Namecheap Private Email) ──────────────────────────────────
EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = 'mail.privateemail.com'
EMAIL_PORT          = 587
EMAIL_USE_TLS       = True
EMAIL_USE_SSL       = False
EMAIL_HOST_USER     = 'info@fixitpublic.com'
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = 'FixItPublic <info@fixitpublic.com>'
SERVER_EMAIL        = DEFAULT_FROM_EMAIL

# ── 9. Site URL — used to build tracking links in emails ───────────────────────
SITE_URL = os.environ.get('SITE_URL', 'https://fixitpublic.com')

# ── 10. Misc ───────────────────────────────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'