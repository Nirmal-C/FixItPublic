# FixItPublic

> **Bilingual civic issue reporting platform for New Zealand local councils**

FixItPublic lets citizens report broken streetlights, damaged footpaths, graffiti, flooding, and other public infrastructure issues directly to their council maintenance teams. Admins triage, assign, and track every ticket through to resolution — with GPT-4o handling the initial crew assignment and escalation decision automatically on every new submission.

The UI carries both English and Te Reo Māori labels throughout, aligned with the principles of Te Tiriti o Waitangi.

---

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Data Models](#data-models)
6. [API Reference](#api-reference)
7. [Authentication](#authentication)
8. [AI / GPT-4o Pipeline](#ai--gpt-4o-pipeline)
9. [Google Maps Integration](#google-maps-integration)
10. [Email Notifications](#email-notifications)
11. [Custom Decorators](#custom-decorators)
12. [Security & Infrastructure](#security--infrastructure)
13. [Local Development](#local-development)
14. [Environment Variables](#environment-variables)
15. [Docker](#docker)
16. [Kubernetes (AKS)](#kubernetes-aks)
17. [CI/CD](#cicd)
18. [Roadmap](#roadmap)
19. [Contributors](#contributors)

---

## Features

### Citizen-Facing
- **Anonymous or registered reporting** — submit a ticket without an account; provide an optional name and email for status updates
- **Photo uploads** — up to 5 photos per ticket, stored securely in Azure Blob Storage and served via a backend proxy
- **GPS auto-fill** — browser geolocation pre-populates coordinates; a draggable map picker covers the rest
- **Location picker modal** — defaults to Auckland CBD (`-36.8485, 174.7633`), fully draggable
- **Public map** — colour-coded pins by category; filterable by category and status; click a pin for ticket detail
- **Ticket tracking** — citizens can check the status of their own submissions
- **Progressive Web App** — installable on mobile home screens; partial offline capability via service worker
- **Bilingual UI** — English / Te Reo Māori throughout

### Admin-Facing
- **Admin map** — full detail overlay showing reporter name, crew, and escalation flag; quick inline status changes; map type toggle (Roadmap / Satellite / Hybrid / Terrain); unmapped tickets collapsible accordion
- **Tickets page** — full CRUD with filters, sorting, bulk status updates
- **AI Log page** — real-time view of every GPT-4o decision: crew assignment, escalation reasoning, confidence score, raw JSON response
- **User management** — superuser CRUD drawer for all user accounts; right-side slide-over using native `<dialog>` element to avoid z-index conflicts
- **Stats dashboard** — live breakdown by status, category, and crew

### AI / Intelligence
- **GPT-4o ticket analysis** — fires automatically on every new ticket via a Django `post_save` signal in a background daemon thread (zero latency for the citizen)
- **Crew assignment** — GPT-4o confirms or corrects the submitted crew based on ticket description and category
- **Escalation decision** — GPT-4o decides whether to escalate and to which level: `senior_engineer`, `council_manager`, or `emergency`
- **Structured output** — one-line summary, step-by-step reasoning array, and a confidence score; all persisted in `AILog`
- **Graceful degradation** — if `OPENAI_API_KEY` is absent or the call fails, an error entry is written to `AILog` and the ticket is saved normally

---

## Architecture Overview

```
Browser (React SPA / PWA)
        │
        │  HTTPS
        ▼
 Nginx (frontend container)
        │  /api/* proxy
        ▼
Django REST Framework (backend container)
        │
        ├──► PostgreSQL (Azure Database for PostgreSQL – Flexible Server, SSL)
        ├──► Azure Blob Storage (ticket photos + avatars)
        ├──► OpenAI API (GPT-4o — background thread)
        └──► SMTP (Namecheap Private Email, port 587)
```

Both containers are deployed to **Azure Kubernetes Service (AKS)** and updated on every push to `main` via **GitHub Actions CI/CD**.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Web framework | Django 4+ |
| REST layer | Django REST Framework |
| Auth | SimpleJWT (60-min access / 7-day rotating refresh) |
| Database | PostgreSQL via psycopg2-binary |
| File storage | Azure Blob Storage via django-storages |
| AI | OpenAI Python SDK (GPT-4o) |
| Google auth | google-auth library |
| Images | Pillow |
| Static files | WhiteNoise |
| Production server | Gunicorn |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router v7 |
| HTTP client | Axios |
| Maps | Google Maps JavaScript API |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| PWA | manifest.json + service worker (`sw.js`) |

### Infrastructure
| Component | Technology |
|---|---|
| Container runtime | Docker + Docker Compose (dev) |
| Container registry | Azure Container Registry (ACR) |
| Orchestration | Azure Kubernetes Service (AKS) |
| CI/CD | GitHub Actions |

---

## Project Structure

```
FixItPublic/
├── backend/
│   ├── api/
│   │   ├── migrations/          # 10 migrations: User, MaintenanceTicket, AILog, avatar
│   │   ├── management/commands/ # create_superuser_from_env
│   │   ├── admin.py
│   │   ├── apps.py              # registers post_save signal in ready()
│   │   ├── base.py              # shared base view helpers
│   │   ├── cultural_guardian.py # Wāhi Tapu cultural sensitivity check (stub)
│   │   ├── decorators.py        # @log_request, @require_council_role, @cache_response
│   │   ├── emails.py            # welcome, sign-in, ticket confirm, status-update emails
│   │   ├── google_auth.py       # Google OAuth token verification
│   │   ├── models.py            # User, MaintenanceTicket, AILog
│   │   ├── permissions.py       # IsCouncilAdmin, IsSuperuser
│   │   ├── serializers.py       # All DRF serializers incl. AILogSerializer
│   │   ├── services.py          # Business logic layer
│   │   ├── signals.py           # GPT-4o post_save signal + background thread
│   │   ├── strategies.py        # Strategy pattern for ticket processing
│   │   ├── token_serializer.py  # Custom JWT token serializer (adds role)
│   │   ├── urls.py              # All /api/* routes
│   │   ├── utils.py             # Shared utilities
│   │   ├── validators.py        # Input validation helpers
│   │   └── views.py             # All API views (~1 000 lines)
│   ├── certs/
│   │   └── root.crt             # Azure PostgreSQL root certificate
│   ├── core/
│   │   ├── settings.py          # Django settings (env-driven)
│   │   ├── urls.py              # Root URL conf
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── tickets/                 # Local media storage (dev only)
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── entrypoint.sh            # Runs migrate + collectstatic + gunicorn
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── manifest.json        # PWA manifest
│   │   ├── sw.js                # Service worker
│   │   └── _redirects           # Netlify/nginx SPA fallback
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js        # Axios instance, interceptors, named API objects
│   │   ├── components/
│   │   │   ├── AdminMap.jsx          # Admin map with crew/reporter detail
│   │   │   ├── BeforeAfterSlider.jsx # Photo comparison slider
│   │   │   ├── EmptyState.jsx
│   │   │   ├── GoogleAuthButton.jsx
│   │   │   ├── IssueCard.jsx         # Ticket card (citizen view)
│   │   │   ├── Layout.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── LocationPickerModal.jsx # Draggable map marker for report submission
│   │   │   ├── Navbar.jsx
│   │   │   ├── PublicMap.jsx         # Citizen-facing pin map
│   │   │   ├── SkeletonCard.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── Toast.jsx
│   │   ├── contexts/
│   │   │   ├── AdminAuthContext.jsx  # Admin JWT lifecycle
│   │   │   ├── CitizenAuthContext.jsx # Citizen JWT lifecycle + avatar cache
│   │   │   └── ThemeContext.jsx      # Light/dark toggle
│   │   ├── hooks/
│   │   │   ├── useNotifications.js
│   │   │   ├── useStats.js
│   │   │   └── useTickets.js
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminLayout.jsx
│   │   │   │   ├── AdminLoginPage.jsx
│   │   │   │   ├── AILogPage.jsx     # GPT-4o decision log
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── TicketsPage.jsx
│   │   │   │   └── UsersPage.jsx     # native <dialog> drawer + delete modal
│   │   │   ├── CitizenDashboardPage.jsx  # Profile edit + avatar upload
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ReportIssuePage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   ├── TrackIssuePage.jsx
│   │   │   └── ViewRequestsPage.jsx
│   │   ├── utils/
│   │   │   ├── authUtils.js
│   │   │   ├── constants.js
│   │   │   ├── googleMapStyles.js    # Light + dark map style arrays
│   │   │   └── validation.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── email-templates/
│   │   └── citizen-assignment.html  # HTML email template
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── k8s/
│   ├── backend.yaml   # AKS Deployment + ClusterIP Service for Django
│   └── frontend.yaml  # AKS Deployment + LoadBalancer Service for React
│
├── docs/
│   └── decorator-report.md  # MSE800.2 sprint report on custom Python decorators
│
├── BACKLOG.md          # Approved product backlog (all items implemented)
├── SPECIFICATIONS.md   # Full project specification
└── docker-compose.yml  # Local development orchestration
```

---

## Data Models

### `User` (`api/models.py`)
Extends Django's `AbstractUser`.

| Field | Type | Notes |
|---|---|---|
| `role` | CharField | `citizen` / `admin` / `superuser` |
| `email` | EmailField | Unique; used as login identifier |
| `phone` | CharField | Optional |
| `email_notifications` | BooleanField | Default `False`; gates all transactional emails |
| `avatar` | ImageField | Stored in Azure Blob under `avatars/` prefix |

### `MaintenanceTicket` (`api/models.py`)
Core entity for every reported issue.

| Field | Type | Notes |
|---|---|---|
| `title` | CharField | Required |
| `description` | TextField | Optional |
| `category` | CharField | e.g. streetlight, footpath, graffiti |
| `status` | CharField | `pending` / `in_progress` / `resolved` / `closed` |
| `location_description` | TextField | Free-text location |
| `lat` / `lng` | DecimalField | GPS coordinates from map picker or browser geolocation |
| `photo_1` … `photo_5` | ImageField | Up to 5 photos; served via backend proxy |
| `reporter_name` | CharField | Anonymous reporters only |
| `reporter_email` | EmailField | Anonymous reporters only |
| `reporter_user` | ForeignKey | Authenticated reporters |
| `assigned_crew` | CharField | Set by submitter; may be corrected by GPT-4o |
| `escalated` | BooleanField | Set by GPT-4o signal |
| `escalation_level` | CharField | `senior_engineer` / `council_manager` / `emergency` |
| `escalation_note` | TextField | GPT-4o reasoning summary |
| `escalated_at` | DateTimeField | Auto-set when escalated |
| `escalated_by` | CharField | `ai` or admin username |

### `AILog` (`api/models.py`)
One-to-one with `MaintenanceTicket`. Written by the GPT-4o background thread.

| Field | Type | Notes |
|---|---|---|
| `ticket` | OneToOneField | The analysed ticket |
| `assigned_crew` | CharField | GPT-4o crew decision |
| `escalated` | BooleanField | |
| `escalation_level` | CharField | |
| `escalation_note` | TextField | |
| `summary` | TextField | One-line GPT-4o description |
| `decision` | CharField | `success` / `escalated` / `error` |
| `reasoning` | JSONField | Step-by-step reasoning array |
| `confidence` | FloatField | 0.0 – 1.0 |
| `model` | CharField | e.g. `gpt-4o` |
| `raw_response` | JSONField | Full OpenAI response object |
| `status` | CharField | Processing status |

---

## API Reference

All endpoints are prefixed with `/api/`.

### Public Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register/` | Citizen registration (rate-limited: 5/hour/IP) |
| POST | `/auth/token/` | Login — returns JWT access + refresh pair (10/hour/IP) |
| POST | `/auth/token/refresh/` | Refresh access token |
| POST | `/auth/google/` | Google OAuth login |
| POST | `/auth/password-reset/request/` | Send password reset email |
| POST | `/auth/password-reset/confirm/` | Confirm reset with token |

### Citizen Profile
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET / PATCH | `/auth/profile/` | citizen | View / update own profile |
| GET | `/auth/avatar/` | citizen | Proxied avatar blob from Azure |
| POST | `/auth/avatar/` | citizen | Upload new avatar (replaces old) |
| POST | `/auth/change-password/` | citizen | Change password |

### Tickets
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/requests/` | public | List tickets; filterable by status, category, crew |
| POST | `/requests/` | public | Submit new ticket; triggers GPT-4o analysis (10/hour/IP for anon) |
| GET | `/requests/<id>/` | public | Ticket detail |
| PATCH | `/requests/<id>/status/` | admin | Update status |
| PATCH | `/requests/<id>/assign/` | admin | Reassign crew or manually escalate |
| DELETE | `/requests/<id>/delete/` | superuser | Hard delete |
| GET | `/requests/mine/` | citizen | Own tickets |

### Maps & Stats
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/map/` | public | All GPS-tagged tickets (PII-safe for public, full detail for admin) |
| GET | `/stats/` | public | Homepage stats: total, resolved, in-progress counts (cached 5 min) |
| GET | `/admin/stats/` | admin | Full breakdown by status, crew, and category |
| GET | `/photos/<path>/` | public | Proxied Azure Blob photo stream |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/ai-log/` | admin | GPT-4o decision log; filterable by status and category |
| GET / POST / PATCH / DELETE | `/superuser/users/` | superuser | Full user CRUD |

---

## Authentication

### JWT Flow
- **Access token:** 60-minute lifetime; carries `username`, `role`, `exp` in payload
- **Refresh token:** 7-day rotating with blacklist on rotation
- **Storage:** Two separate `localStorage` namespaces — `pfmrs_access_token` (admin) and `pfmrs_citizen_access` (citizen)

### Separate Auth Contexts
`AdminAuthContext` and `CitizenAuthContext` manage independent token lifecycles. The citizen context decodes the JWT before persisting it and throws `err.isAdminRole = true` if an admin account attempts to log in through the citizen portal — a gold banner redirects them to `/admin/login` without ever writing their token to `localStorage`.

Authenticated admins visiting `/` are automatically redirected to `/admin`.

### Axios Interceptor
A 401 interceptor in `src/api/client.js` auto-refreshes tokens on expiry and redirects to the correct login page on final failure.

---

## AI / GPT-4o Pipeline

Every ticket creation fires a Django `post_save` signal in `api/signals.py`. The signal spawns a **daemon thread** that:

1. Reads `title`, `category`, `description`, and `location_description` from the new ticket
2. Calls the OpenAI Chat Completions API with a structured system prompt requesting:
   - Best-fit crew confirmation or correction
   - Escalation decision (yes/no + level + note)
   - One-line summary
   - Step-by-step reasoning array
   - Confidence score (0–1)
3. Sanitises invalid crew names and escalation levels before writing
4. Patches the `MaintenanceTicket` with corrected crew and escalation data
5. Writes a full `AILog` row (success, escalated, or error)

The citizen's HTTP response is **never delayed** — the analysis runs entirely in the background. If `OPENAI_API_KEY` is not configured, the signal exits cleanly after logging a warning.

Admins can review every decision on the **Admin → AI Log** page, which supports real-time filtering by status and category.

---

## Google Maps Integration

Three distinct map surfaces, all loading the Maps JS SDK asynchronously via a promise-cached script injector:

| Component | Purpose |
|---|---|
| `PublicMap.jsx` | Citizen-facing; colour-coded pins by category; category and status filters; click-to-open info window |
| `AdminMap.jsx` | Admin-facing; extends PublicMap with crew/reporter detail, red escalation badges, inline status-change buttons, map type toggle, status count strip, and unmapped ticket accordion |
| `LocationPickerModal.jsx` | Report submission; draggable marker defaulting to Auckland CBD (`-36.8485, 174.7633`); confirms lat/lng back to the report form |

Map styling adapts to the active light/dark theme via `utils/googleMapStyles.js`. The API key is read from `VITE_GOOGLE_MAPS_API_KEY` — without it, the map renders a grey box with a Google error overlay.

---

## Email Notifications

All transactional email is in `api/emails.py`, delivered over SMTP via Namecheap Private Email (`mail.privateemail.com:587`). All sends are gated on `user.email_notifications`.

| Function | Trigger |
|---|---|
| `send_welcome_email` | Successful registration (opted-in users) |
| `send_signin_notification` | Successful login (opted-in users) |
| `send_ticket_confirmation` | New ticket submitted (opted-in users; always for anonymous reporters who provided email) |
| `send_ticket_status_update` | Ticket status or crew changes (same gating as above) |

HTML email templates with FixItPublic branding live in `frontend/email-templates/`.

---

## Custom Decorators

Three custom Python decorators in `backend/api/decorators.py` handle cross-cutting concerns without modifying view logic.

### `@log_request`
Wraps any view to emit a structured log line: HTTP method, path, authenticated user email (or `anonymous`), response status code, and execution time in milliseconds. Applied to `map_tickets`, `admin_stats`, and `public_stats`.

### `@require_council_role`
Returns HTTP 403 immediately if the caller is not an authenticated council admin. Makes the access constraint visible directly in the decorator stack rather than hidden inside a DRF permission class file.

### `@cache_response(timeout=300)`
Caches a view's response data in Django's cache backend keyed by full request path (including query string) for a configurable TTL. Only 200 responses are cached. Adds `X-Cache: HIT` or `MISS` headers for transparency. Applied to `public_stats` with a 5-minute TTL to eliminate repeated database aggregation on every homepage load.

All three decorators use `functools.wraps` to preserve the original function's `__name__` and `__doc__`.

---

## Security & Infrastructure

| Concern | Implementation |
|---|---|
| TLS everywhere | Browser ↔ nginx, nginx ↔ Django, Django ↔ PostgreSQL (sslmode=require + bundled root.crt) |
| Secret management | All sensitive values injected via `kubectl create secret`; never stored in the repo |
| Rate throttling | 10 anon submissions/hour, 5 registrations/hour, 10 logins/hour per IP (DRF throttle classes) |
| CORS | `django-cors-headers`; production restricts to deployed frontend origin |
| Photo proxy | `/api/photos/<path>/` generates a fresh SAS URL server-side and streams bytes; Azure key never reaches the browser |
| JWT blacklist | Refresh tokens are blacklisted on rotation, preventing reuse after refresh |
| Role enforcement | Three roles (`citizen`, `admin`, `superuser`) encoded in JWT and enforced by `IsCouncilAdmin` and `IsSuperuser` permission classes |

---

## Local Development

### Prerequisites
- Docker Desktop (or Docker + Docker Compose v2)
- A `.env` file at the repo root (see [Environment Variables](#environment-variables))

### Start
```bash
# Clone
git clone https://github.com/Nirmal-C/FixItPublic.git
cd FixItPublic

# Configure
cp .env.example .env
# Edit .env — fill in DB, Azure, OpenAI, Google Maps, SMTP values

# Build and start all services
docker compose up --build
```

| Service | URL |
|---|---|
| React frontend | http://localhost:5173 |
| Django backend | http://localhost:8000 |

Vite's dev server proxies all `/api` requests to the Django container, so no CORS issues in development.

### Running migrations manually
```bash
docker compose exec backend python manage.py migrate
```

### Creating a superuser manually
```bash
docker compose exec backend python manage.py create_superuser_from_env
```
This reads `SUPERUSER_USERNAME`, `SUPERUSER_EMAIL`, and `SUPERUSER_PASSWORD` from the environment.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Django cryptographic signing key |
| `DEBUG` | `True` in dev, `False` in production |
| `ALLOWED_HOSTS` | Comma-separated allowed host names |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default `5432`) |
| `AZURE_STORAGE_ACCOUNT_NAME` | Azure Blob Storage account name |
| `AZURE_STORAGE_ACCOUNT_KEY` | Azure Blob Storage account key |
| `AZURE_STORAGE_CONTAINER_NAME` | Blob container name (default `maintenance-photos`) |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o analysis |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key (frontend) |
| `EMAIL_HOST` | SMTP host (default `mail.privateemail.com`) |
| `EMAIL_PORT` | SMTP port (default `587`) |
| `EMAIL_HOST_USER` | SMTP username / from address |
| `EMAIL_HOST_PASSWORD` | SMTP password |
| `SUPERUSER_USERNAME` | Auto-created superadmin username |
| `SUPERUSER_EMAIL` | Auto-created superadmin email |
| `SUPERUSER_PASSWORD` | Auto-created superadmin password |
| `CORS_ALLOWED_ORIGINS` | Production frontend origin for CORS |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |

---

## Docker

### Development (`Dockerfile.dev`)
Both services mount source directories as volumes for hot-reload:
- Backend: Django dev server on port 8000
- Frontend: Vite dev server on port 5173 (with `--host` for container exposure)

### Production (`Dockerfile`)
**Backend:**
```
python:3.11-slim
  → install libpq-dev, gcc
  → pip install requirements.txt + gunicorn
  → copy source
  → ENTRYPOINT entrypoint.sh (migrate → collectstatic → gunicorn)
```

**Frontend:**
```
node:* (build stage)
  → npm ci && vite build
nginx:alpine
  → copy dist/ → /usr/share/nginx/html
  → custom nginx.conf with SPA fallback and /api proxy
```

---

## Kubernetes (AKS)

Both workloads are defined in `k8s/`:

### `k8s/backend.yaml`
- **Deployment:** `django-backend`, 1 replica, `Recreate` strategy (kills old pod first — single CPU node optimisation), image from ACR tagged to Git commit SHA
- **Service:** `ClusterIP` on port 8000 (internal only)
- All secrets injected via `secretRef: app-secrets`

### `k8s/frontend.yaml`
- **Deployment:** `react-frontend`, 1 replica, image from ACR
- **Service:** `LoadBalancer` on port 80 — this is the public entry point; nginx inside the container proxies `/api` to `django-backend-service:8000`

---

## CI/CD

GitHub Actions workflow (`.github/workflows/`) runs on every push to `main`:

1. **Build** — Docker images for `backend` and `frontend`
2. **Push** — Images pushed to Azure Container Registry (ACR), tagged with the Git commit SHA
3. **Secrets** — `kubectl create secret` updates `app-secrets` in the AKS cluster with current env values
4. **Deploy** — `kubectl set image` updates both deployments with the new SHA-tagged images
5. **Rollout** — `kubectl rollout status` waits for both rollouts to complete before the workflow exits

Image tags are pinned to the Git commit SHA for fully reproducible, rollback-friendly deploys.

---

## Roadmap

Items below are approved and planned:

| Feature | Description |
|---|---|
| **Spatial deduplication** | Cluster reports within a 50-metre radius to prevent duplicate tickets for the same issue |
| **GPS EXIF extraction** | Read GPS metadata from uploaded photos to auto-populate coordinates without requiring the map picker |
| **Google Maps Geocoding** | Convert raw lat/lng to a verified street address string for crew dispatch |
| **MCP Cultural Guardian** | Cross-reference report locations against Wāhi Tapu databases to flag culturally sensitive sites before dispatch |
| **PII Redaction Engine** | Strip personally identifiable information locally before ticket data is sent to any cloud AI service |

---

## Contributors

| Name | Role |
|---|---|
| **Nirmal Unagalle** | Full-stack development, backend architecture |
| **Rukshan De Silva** | Full-stack development, frontend architecture |

Repository: https://github.com/Nirmal-C/FixItPublic
