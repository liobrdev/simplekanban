import os

from re import escape
from datetime import timedelta
from decouple import config, Csv
from email.utils import getaddresses

import secret_django_settings as secrets


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = secrets.SECRET_KEY
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())
ADMINS = getaddresses(config('ADMINS', cast=Csv()))

DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT')
EMAIL_HOST_USER = secrets.EMAIL_HOST_USER
EMAIL_HOST_PASSWORD = secrets.EMAIL_HOST_PASSWORD
EMAIL_USE_SSL = config('EMAIL_USE_SSL', cast=bool)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', cast=bool)
EMAIL_SUBJECT_PREFIX = config('EMAIL_SUBJECT_PREFIX') + ' '
SERVER_EMAIL = config('SERVER_EMAIL')

INSTALLED_APPS = [
    'activity_logs',
    'authentication',
    'boards',
    'channels',
    'columns',
    'corsheaders',
    'custom_db_logger',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django_filters',
    'django_user_agents',
    'invitations',
    'knox',
    'rest_framework',
    'tasks',
    'users',
    'utils',
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
    'django_user_agents.middleware.UserAgentMiddleware',
    'simplekanban_api.middleware.ClientIPMiddleware',
]

AUTH_USER_MODEL = 'users.CustomUser'

AUTHENTICATION_BACKENDS = ['authentication.backends.CustomModelBackend',]

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

ROOT_URLCONF = 'simplekanban_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates'),],
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

WSGI_APPLICATION = 'simplekanban_api.wsgi.application'
ASGI_APPLICATION = 'simplekanban_api.websocket_router.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': secrets.DB_DEFAULT_NAME,
        'USER': secrets.DB_DEFAULT_USER,
        'PASSWORD': secrets.DB_DEFAULT_PASSWORD,
        'HOST': secrets.DB_DEFAULT_HOST,
        'PORT': secrets.DB_DEFAULT_PORT,
    },
    'logger': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': secrets.DB_LOGGER_NAME,
        'USER': secrets.DB_LOGGER_USER,
        'PASSWORD': secrets.DB_LOGGER_PASSWORD,
        'HOST': secrets.DB_LOGGER_HOST,
        'PORT': secrets.DB_LOGGER_PORT,
    },
}

DATABASE_ROUTERS = ['simplekanban_api.database_router.DatabaseRouter']

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'default': {
            'format': '%(levelname)s %(asctime)s %(pathname)s line %(lineno)d in %(funcName)s: %(message)s'
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'default',
            'level': 'DEBUG',
        },
        'database': {
            'class': 'custom_db_logger.db_log_handler.DatabaseLogHandler',
            'formatter': 'default',
            'level': 'INFO',
        },
        'mail_admins': {
            'class': 'django.utils.log.AdminEmailHandler',
            'formatter': 'default',
            'level': 'INFO',
        },
    },
    'loggers': {
        '': {
            'handlers': ['console'],
            'level': config('DEFAULT_LOG_LEVEL', default='ERROR', cast=str),
        },
        'authentication': {
            'handlers': ['database', 'mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'boards': {
            'handlers': ['database', 'mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'db_logger': {
            'handlers': ['database'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['database', 'mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'django.security.*': {
            'handlers': ['database', 'mail_admins'],
            'propagate': True,
        },
        'throttling': {
            'handlers': ['database', 'mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'users': {
            'handlers': ['database', 'mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'America/New_York'
USE_I18N = True
USE_L10N = True
USE_TZ = True

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [
                'redis://:' +
                secrets.REDIS_PASSWORD +
                '@' +
                config('REDIS_HOST') +
                ':6379',
            ],
        },
    },
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('knox.auth.TokenAuthentication',),
    'DEFAULT_PARSER_CLASSES': ('rest_framework.parsers.JSONParser',),
    'DEFAULT_RENDERER_CLASSES': ('rest_framework.renderers.JSONRenderer',),
    'DEFAULT_THROTTLE_RATES': {
        'create_board': ['50/m'],
        'create_msg': ['60/m'],
        'invalid_command': ['1/d'],
        'invite_member': ['25/m'],
        'login': ['15/m', '60/d'],
        'no_command': ['1/d'],
        'register': ['15/m', '60/d'],
        'default': ['120/m'],
    },
    'NUM_PROXIES': config('NUM_PROXIES', default=None, cast=int),
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
}

REST_KNOX = {
  'AUTO_REFRESH': True,
  'MIN_REFRESH_INTERVAL': 120,
  'TOKEN_TTL': timedelta(hours=1),
  'USER_SERIALIZER': 'users.serializers.ReadOnlyUserSerializer',
}

DOMAIN = config('DOMAIN')
CORS_ALLOWED_ORIGIN_REGEX = r'^(https?:\/\/)?(\w+\.)?' + escape(DOMAIN) + r'$'
CORS_ALLOWED_ORIGIN_REGEXES = [CORS_ALLOWED_ORIGIN_REGEX,]

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'