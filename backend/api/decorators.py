"""
Custom function decorators for the FixItPublic API.

Three decorators are defined here and applied to function-based views:

  @log_request         — records method, path, user, and execution time
  @require_council_role — enforces council-admin access without the DRF
                          permission-class boilerplate
  @cache_response(n)   — caches a 200 OK response for n seconds and
                          adds an X-Cache header for transparency

All three use functools.wraps so that the original function's __name__
and __doc__ are preserved, keeping Django's URL introspection clean.
"""

import logging
import time
import functools

from django.core.cache import cache
from rest_framework.response import Response

logger = logging.getLogger(__name__)


# ── 1. Request logger ───────────────────────────────────────────────────────────

def log_request(view_func):
    """
    Decorator that logs every inbound API request.

    Captures:
      - HTTP method and request path
      - Authenticated user e-mail (or 'anonymous')
      - Total view execution time in milliseconds
      - HTTP response status code

    The log output goes to Django's standard logging pipeline, so it
    respects whatever handler (console, file, etc.) is configured in
    settings.LOGGING without any extra setup.

    Usage:
        @api_view(['GET'])
        @log_request
        def my_view(request):
            ...
    """
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        start = time.monotonic()
        user_label = (
            request.user.email
            if request.user and request.user.is_authenticated
            else 'anonymous'
        )
        response = view_func(request, *args, **kwargs)
        duration_ms = round((time.monotonic() - start) * 1000, 1)
        logger.info(
            '[%s] %s %s  user=%s  %.1fms',
            response.status_code,
            request.method,
            request.path,
            user_label,
            duration_ms,
        )
        return response

    return wrapper


# ── 2. Council-role guard ───────────────────────────────────────────────────────

def require_council_role(view_func):
    """
    Decorator that enforces council-admin access on a function-based view.

    Returns HTTP 403 immediately if the requesting user is not an
    authenticated council admin, without executing the view body.
    This replaces the DRF @permission_classes([IsCouncilAdmin]) pattern
    for function-based views, making the intent explicit in the decorator
    stack rather than hidden inside a permission class.

    Usage:
        @api_view(['GET'])
        @permission_classes([AllowAny])   # let this decorator own the check
        @require_council_role
        def admin_only_view(request):
            ...
    """
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = request.user
        is_admin = (
            user is not None
            and user.is_authenticated
            and getattr(user, 'is_council_admin', False)
        )
        if not is_admin:
            return Response(
                {'detail': 'Council admin access required.'},
                status=403,
            )
        return view_func(request, *args, **kwargs)

    return wrapper


# ── 3. Response cache ───────────────────────────────────────────────────────────

def cache_response(timeout=300):
    """
    Decorator factory that caches a DRF view's response data.

    Only successful (HTTP 200) responses are cached.  The cache key is
    derived from the full request path including query string, so
    different filter combinations are cached independently.

    An X-Cache header is added to every response:
      X-Cache: HIT   — data served from cache
      X-Cache: MISS  — data freshly computed and now stored

    Args:
        timeout (int): seconds to keep the cached value (default 300 = 5 min)

    Usage:
        @api_view(['GET'])
        @permission_classes([AllowAny])
        @cache_response(timeout=300)
        def public_stats(request):
            ...
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            cache_key = f'fixitpublic:view:{request.get_full_path()}'
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                resp = Response(cached_data)
                resp['X-Cache'] = 'HIT'
                return resp

            response = view_func(request, *args, **kwargs)
            if getattr(response, 'status_code', None) == 200 and hasattr(response, 'data'):
                cache.set(cache_key, response.data, timeout)
                response['X-Cache'] = 'MISS'
            return response

        return wrapper
    return decorator
