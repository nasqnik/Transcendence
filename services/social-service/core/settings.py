import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY environment variable is required.")

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'social-service']

INSTALLED_APPS = [
    'daphne',
    'channels',
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'common',
    'social',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'social_db'),
        'USER': os.getenv('DB_USER', 'transcendence'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'transcendence'),
        'HOST': os.getenv('DB_HOST', 'db'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

APP_NAME = os.getenv('APP_NAME', 'KiddoPath')
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'common.authentication.KidJWTAuthentication',
        'common.authentication.ParentJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'UNAUTHENTICATED_USER': None,
}

SPECTACULAR_SETTINGS = {
    'TITLE': f'{APP_NAME} Social API',
    'DESCRIPTION': 'Friends and online presence for KiddoPath kids.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_SETTINGS': {
        'persistAuthorization': True,
    },
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'BearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            }
        }
    },
    'SECURITY': [{'BearerAuth': []}],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_MINUTES', '60'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', '7'))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

INTERNAL_SERVICE_TOKEN = os.getenv('INTERNAL_SERVICE_TOKEN')
if not INTERNAL_SERVICE_TOKEN:
    raise ImproperlyConfigured("INTERNAL_SERVICE_TOKEN environment variable is required.")

AUTH_INTERNAL_URL = os.getenv('AUTH_INTERNAL_URL')
if not AUTH_INTERNAL_URL:
    raise ImproperlyConfigured("AUTH_INTERNAL_URL environment variable is required.")

# Docker-network defaults match .env.example so local stacks keep working
# even if an older .env omits these keys.
GAMIFICATION_INTERNAL_URL = os.getenv(
    'GAMIFICATION_INTERNAL_URL',
    'http://gamification-service:8000',
)
CATALOG_INTERNAL_URL = os.getenv(
    'CATALOG_INTERNAL_URL',
    'http://catalog-service:8000',
)

REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')

# Presence WebSocket heartbeat (seconds)
PRESENCE_PING_INTERVAL = int(os.getenv('PRESENCE_PING_INTERVAL', '30'))
PRESENCE_STALE_AFTER = int(os.getenv('PRESENCE_STALE_AFTER', '90'))

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}
