# Python Decorators in FixItPublic — MSE800.2 Sprint Report

**Student:** Rukshan de Silva
**Project:** FixItPublic — Civic Issue Reporting Platform
**Repository:** https://github.com/Nirmal-C/FixItPublic
**Sprint:** 1–4 · Backend API Refinement

---

## 1. Introduction

FixItPublic is a full-stack civic platform that allows citizens to report local maintenance issues (potholes, broken lights, flooding) and council admins to triage and resolve them. The backend is built with Django REST Framework (DRF). As part of Sprint 4 refinement, three custom Python decorators were introduced to reduce code duplication, centralise cross-cutting concerns, and make the intent of each API endpoint explicit in its decorator stack.

All decorators reside in `backend/api/decorators.py` and are applied to function-based API views in `backend/api/views.py`.

---

## 2. Decorator Implementations

### 2.1 `@log_request` — Request Auditing

```python
def log_request(view_func):
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        start     = time.monotonic()
        user      = request.user.email if request.user.is_authenticated else 'anonymous'
        response  = view_func(request, *args, **kwargs)
        duration  = round((time.monotonic() - start) * 1000, 1)
        logger.info('[%s] %s %s  user=%s  %.1fms',
                    response.status_code, request.method,
                    request.path, user, duration)
        return response
    return wrapper
```

**Purpose:** Records every API call passing through a decorated view — HTTP method, path, authenticated user e-mail (or `anonymous`), HTTP status code, and total execution time in milliseconds. Output is routed through Django's standard `logging` pipeline, respecting whatever handler (console, file, cloud) is configured in `settings.LOGGING`.

**Impact:** Applied to `map_tickets`, `admin_stats`, and `public_stats`. Previously, no structured request logging existed for these endpoints. The decorator adds observability without modifying a single line of view logic.

---

### 2.2 `@require_council_role` — Access Control Guard

```python
def require_council_role(view_func):
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user     = request.user
        is_admin = (user and user.is_authenticated
                    and getattr(user, 'is_council_admin', False))
        if not is_admin:
            return Response({'detail': 'Council admin access required.'}, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper
```

**Purpose:** Enforces council-admin access at the decorator level. If the caller is not an authenticated council admin, HTTP 403 is returned immediately — the view body never executes.

**Impact:** Applied to `admin_stats`, replacing the DRF `@permission_classes([IsCouncilAdmin])` pattern for this view. Where the DRF class hides the access rule inside a separate `permissions.py` file, `@require_council_role` makes the constraint visible directly in the view's decorator stack — easier to read, easier to test, and reusable across any future function-based view without importing a permission class.

```python
# Before
@api_view(['GET'])
@permission_classes([IsCouncilAdmin])
def admin_stats(request): ...

# After
@api_view(['GET'])
@permission_classes([AllowAny])   # DRF passthrough
@require_council_role             # explicit custom guard
@log_request
def admin_stats(request): ...
```

---

### 2.3 `@cache_response(timeout)` — Response Caching

```python
def cache_response(timeout=300):
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            key    = f'fixitpublic:view:{request.get_full_path()}'
            cached = cache.get(key)
            if cached is not None:
                resp = Response(cached)
                resp['X-Cache'] = 'HIT'
                return resp
            response = view_func(request, *args, **kwargs)
            if getattr(response, 'status_code', None) == 200:
                cache.set(key, response.data, timeout)
                response['X-Cache'] = 'MISS'
            return response
        return wrapper
    return decorator
```

**Purpose:** Caches a view's response data in Django's cache backend (keyed by full request path including query string) for a configurable number of seconds. Only HTTP 200 responses are cached. An `X-Cache: HIT` or `MISS` header is added to every response for transparency during development.

**Impact:** Applied to `public_stats` with a 300-second TTL. This endpoint aggregates counts across the full ticket table and is called by the public homepage on every load. Caching eliminates repeated database aggregation queries without any change to the view logic itself.

```python
@api_view(['GET'])
@permission_classes([AllowAny])
@cache_response(timeout=300)   # 5-minute cache
@log_request
def public_stats(request): ...
```

---

## 3. Design Principles Applied

| Principle | How decorators support it |
|---|---|
| **Single Responsibility** | Each decorator does exactly one thing — log, guard, or cache |
| **DRY** | One decorator definition, applied wherever needed — no copy-paste |
| **Open/Closed** | Views are extended with new behaviour without modifying their bodies |
| **Transparency** | `functools.wraps` preserves `__name__` and `__doc__`; `X-Cache` header exposes cache state |

---

## 4. Summary

Three custom decorators — `@log_request`, `@require_council_role`, and `@cache_response` — were introduced to the FixItPublic backend to address observability, access control, and performance in a clean, reusable way. Each decorator separates a cross-cutting concern from business logic, demonstrating the core value of the decorator pattern: behaviour composition without inheritance and without modifying existing code.

**Relevant files:**
- `backend/api/decorators.py` — decorator definitions
- `backend/api/views.py` — applied at lines 390, 434–436, 561–562
