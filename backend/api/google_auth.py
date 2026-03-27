"""
api/google_auth.py
~~~~~~~~~~~~~~~~~~
Verifies a Google ID token sent from the frontend and returns a JWT pair.

Flow:
  1. Frontend gets a Google ID token via Google Identity Services
  2. Sends it to POST /api/auth/google/ { "token": "<id_token>" }
  3. We verify it with Google's public keys
  4. Look up or create the user
  5. Return access + refresh JWT pair (same shape as /api/auth/token/)

New citizen accounts are created automatically.
Admin/superuser accounts are NEVER auto-created — they must already exist.
If an existing admin's email matches the Google account they can sign in.

Requires:
  pip install google-auth
  GOOGLE_CLIENT_ID env var set to your OAuth 2.0 Web Client ID
"""

import os
import logging

from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .emails import send_welcome_email, send_signin_notification

logger = logging.getLogger(__name__)
User = get_user_model()

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')


def _make_jwt_pair(user):
    """Generate a SimpleJWT access + refresh pair for the given user."""
    refresh = RefreshToken.for_user(user)
    refresh['username']            = user.username
    refresh['role']                = user.role
    refresh['email']               = user.email
    refresh['email_notifications'] = user.email_notifications
    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth_view(request):
    """
    POST /api/auth/google/
    Body: { "token": "<google_id_token>" }
    Returns: { "access": "...", "refresh": "...", "created": bool }
    """
    id_token_str = request.data.get('token', '').strip()
    if not id_token_str:
        return Response({'detail': 'Google ID token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not GOOGLE_CLIENT_ID:
        logger.error('GOOGLE_CLIENT_ID env var is not set')
        return Response({'detail': 'Google auth is not configured on this server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        idinfo = id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        logger.warning('Google token verification failed: %s', exc)
        return Response({'detail': 'Invalid or expired Google token. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)

    google_email = idinfo.get('email', '').lower().strip()
    google_name  = idinfo.get('given_name', '') or idinfo.get('name', '').split()[0]

    if not google_email:
        return Response({'detail': 'Google account has no email address.'}, status=status.HTTP_400_BAD_REQUEST)

    if not idinfo.get('email_verified'):
        return Response({'detail': 'Google account email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)

    created = False
    try:
        user = User.objects.get(email=google_email)
        if not user.is_active:
            return Response(
                {'detail': 'This account has been deactivated. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Existing account: treat this as a sign-in (welcome email is only for first-time creation).
        send_signin_notification(user)
    except User.DoesNotExist:
        username = _unique_username(google_email.split('@')[0])
        user = User.objects.create_user(
            username=username,
            email=google_email,
            first_name=google_name,
            password=None,
            role=User.Role.CITIZEN,
            email_notifications=True,
        )
        user.set_unusable_password()
        user.save()
        created = True
        logger.info('New citizen created via Google auth: %s', google_email)
        send_welcome_email(user)

    tokens = _make_jwt_pair(user)
    return Response({
        **tokens,
        'created': created,
        'role':    user.role,
    }, status=status.HTTP_200_OK)


def _unique_username(base):
    import re
    base = re.sub(r'[^\w]', '_', base)[:20] or 'user'
    username = base
    counter  = 1
    while User.objects.filter(username=username).exists():
        username = f'{base}_{counter}'
        counter += 1
    return username
