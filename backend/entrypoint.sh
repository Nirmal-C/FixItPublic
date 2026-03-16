#!/bin/sh
set -e

echo "→ Running migrations..."
python manage.py migrate --noinput

echo "→ Ensuring superuser exists..."
python manage.py create_superuser_from_env

echo "→ Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 core.wsgi:application