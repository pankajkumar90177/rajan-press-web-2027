
"""
Django settings for config project.
Local development and Render deployment settings.
"""

import os
from pathlib import Path

import dj_database_url


# --------------------------------------------------
# BASE DIRECTORY
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent


# --------------------------------------------------
# SECURITY SETTINGS
# --------------------------------------------------

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")

if not SECRET_KEY:
    # Local development only. Set DJANGO_SECRET_KEY on Render.
    SECRET_KEY = "django-insecure-local-development-only-change-me"

DEBUG = os.environ.get("DEBUG", "True").lower() == "true"


ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        "ALLOWED_HOSTS",
        "127.0.0.1,localhost"
    ).split(",")
    if host.strip()
]


CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CSRF_TRUSTED_ORIGINS", ""
    ).split(",")
    if origin.strip()
]


# --------------------------------------------------
# APPLICATIONS
# --------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Existing application
    "backend",
]


# --------------------------------------------------
# MIDDLEWARE
# --------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


# --------------------------------------------------
# TEMPLATES
# --------------------------------------------------

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "templates",
            BASE_DIR / "Login_system",
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


# --------------------------------------------------
# DATABASE
# --------------------------------------------------
# On Render, set DATABASE_URL to the Render PostgreSQL
# Internal Database URL. Locally, use PostgreSQL values
# from environment variables.

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=not DEBUG,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get(
                "DB_NAME", "rajan_billing"
            ),
            "USER": os.environ.get(
                "DB_USER", "postgres"
            ),
            "PASSWORD": os.environ.get(
                "DB_PASSWORD", ""
            ),
            "HOST": os.environ.get(
                "DB_HOST", "localhost"
            ),
            "PORT": os.environ.get(
                "DB_PORT", "5432"
            ),
            "CONN_MAX_AGE": 600,
        }
    }


# --------------------------------------------------
# PASSWORD VALIDATION
# --------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# --------------------------------------------------
# INTERNATIONALIZATION
# --------------------------------------------------

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


# --------------------------------------------------
# STATIC FILES
# --------------------------------------------------

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_DIRS = [
    BASE_DIR / "static",
    BASE_DIR / "Login_system",
]

if not DEBUG:
    STATICFILES_STORAGE = (
        "whitenoise.storage.CompressedManifestStaticFilesStorage"
    )


# --------------------------------------------------
# EMAIL
# --------------------------------------------------
# Console backend is suitable for development only.

EMAIL_BACKEND = (
    "django.core.mail.backends.console.EmailBackend"
)


# --------------------------------------------------
# DEFAULT PRIMARY KEY
# --------------------------------------------------

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --------------------------------------------------
# PRODUCTION SECURITY
# --------------------------------------------------

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO",
        "https",
    )

    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True
