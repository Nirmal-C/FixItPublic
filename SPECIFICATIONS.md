# FixItPublic — Project Specifications

**FixItPublic** is a bilingual (English / Te Reo Māori) public infrastructure maintenance
portal built for New Zealand local councils. Citizens report broken streetlights, damaged
footpaths, graffiti, and other facility issues directly to their council maintenance teams.
Admins triage, assign, and track every ticket through to resolution — with GPT-4o handling
the initial crew assignment and escalation decision automatically.

---

## 🏗️ Core Backend

| Component | Detail |
|---|---|
| **Django REST Framework** | Central API hub between the React frontend and all backend services. JWT-authenticated, rate-throttled, fully RESTful. |
| **Custom User Model** | Three roles — `citizen`, `admin`, `superuser` — encoded in the JWT payload and enforced by DRF permission classes (`IsCouncilAdmin`, `IsSuperuser`). |
| **PostgreSQL** | Hosted on Azure Database for PostgreSQL (Flexible Server). SSL-required connection with a root certificate bundled in the repo. |
| **Azure Blob Storage** | All ticket photos are stored in an Azure Blob container (`maintenance-photos`). Django-storages generates short-lived SAS URLs; a photo proxy endpoint streams blobs back to the browser so Azure is never exposed directly. |
| **SimpleJWT** | 60-minute access tokens, 7-day rotating refresh tokens with blacklist on rotation. Token payload carries `username`, `role`, and `exp` — consumed by both auth contexts on the frontend. |
| **Email (SMTP)** | Transactional emails via Namecheap Private Email (`mail.privateemail.com:587`). Four event types: welcome, sign-in notification, ticket confirmation, ticket status update. Gated on `user.email_notifications`. |
| **GPT-4o Signal** | A Django `post_save` signal fires on every new ticket. A background thread calls the OpenAI API, gets crew assignment + escalation decision + reasoning, patches the ticket, and writes an `AILog` row — all via ORM with no HTTP round-trip. |

---

## 🎨 Core Frontend

| Component | Detail |
|---|---|
| **React + Vite** | SPA architecture with React Router v6 for client-side routing. Vite proxies `/api` to the Django container in development. |
| **Progressive Web App (PWA)** | `manifest.json` + `sw.js` service worker enable mobile home-screen installation and offline capability for low-connectivity reporting. |
| **Google Maps JS API** | Three map surfaces: `PublicMap` (citizen-facing pins), `AdminMap` (full detail + status controls + escalation badges), `LocationPickerModal` (draggable marker for report submission). All load the Maps JS SDK asynchronously via a promise-cached script injector. |
| **Browser Geolocation** | `navigator.geolocation.getCurrentPosition()` auto-fills lat/lng on the report form, skipping the map picker when GPS is available. |
| **Tailwind CSS** | Utility-first, mobile-first responsive design. Custom CSS variables for light/dark theming (`--bg-primary`, `--accent`, etc.) with a `ThemeContext` toggling the `dark` class on the document root. |
| **Two Auth Contexts** | `AdminAuthContext` and `CitizenAuthContext` each maintain their own `localStorage` keys (`pfmrs_access_token` / `pfmrs_citizen_access`). The citizen context blocks admin-role tokens at login time — throwing `err.isAdminRole = true` — so admins can never silently log in through the wrong portal. |
| **Axios API Client** | Central `apiClient` with a 401 interceptor that auto-refreshes tokens and redirects to the correct login page on failure. Separate named API objects: `requestsApi`, `authApi`, `statsApi`, `aiLogApi`. |

---

## 🧠 Intelligent & Cultural Features

| Feature | Detail |
|---|---|
| **GPT-4o Ticket Analysis** | On every ticket creation, GPT-4o receives the title, category, description, and location. It returns: best-fit crew, escalation decision (with level and note), a one-line summary, step-by-step reasoning, and a confidence score. All results are stored in the `AILog` table and surfaced on the Admin AI Log page with real-time filtering. |
| **Spatial Deduplication** *(planned)* | Clusters reports within a 50-metre radius to prevent duplicate tickets for the same issue. |
| **GPS EXIF Extraction** *(planned)* | Reads GPS metadata from uploaded photos to auto-populate coordinates without requiring the citizen to use the map picker. |
| **Google Maps Geocoding** *(planned)* | Converts raw lat/lng into a verified street address string for maintenance crew dispatch. |
| **MCP Cultural Guardian** *(planned)* | Cross-references report locations against Wāhi Tapu databases to flag and protect culturally sensitive sites before a crew is dispatched. |
| **PII Redaction Engine** *(planned)* | Strips personally identifiable information locally before ticket data is passed to any cloud AI service. |
| **Anonymous Participation** | Citizens can submit tickets without an account — anonymous reports require only a title, category, and location. Optional name and email fields allow ticket-tracking emails without registration. |
| **Bilingual UI** | All section headings, labels, and CTAs carry Te Reo Māori subtitles alongside English text, aligned with Te Tiriti o Waitangi principles of partnership and participation. |

---

## 🛡️ Security & Infrastructure

| Component | Detail |
|---|---|
| **GitHub Actions CI/CD** | On every push to `main`: builds Docker images for `backend` and `frontend`, pushes them to Azure Container Registry (ACR), updates Kubernetes secrets, deploys to AKS, and waits for rollout. |
| **Azure Kubernetes Service (AKS)** | Two deployments — `django-backend` and `react-frontend` — managed in `k8s/backend.yaml` and `k8s/frontend.yaml`. Image tags are pinned to the Git commit SHA for reproducible deploys. |
| **Kubernetes Secret Management** | All sensitive values (`DJANGO_SECRET_KEY`, `DB_PASSWORD`, `AZURE_STORAGE_ACCOUNT_KEY`, `OPENAI_API_KEY`, etc.) are injected via `kubectl create secret` during the deploy step. Never stored in the repo. |
| **Environment-Driven Config** | `core/settings.py` reads every sensitive value from `os.environ`. A `.env` file is used locally; Kubernetes secrets provide the same vars in production. `DEBUG` is env-controlled. |
| **TLS/SSL Encryption** | All traffic between browser, API, and database is encrypted. PostgreSQL connection enforces `sslmode=require` with the Azure root certificate. |
| **Rate Throttling** | DRF throttle classes limit anonymous ticket creation (10/hour), registration (5/hour), and login (10/hour) per IP to prevent abuse. |
| **CORS** | `django-cors-headers` configured for the deployed frontend origin. `CORS_ALLOW_ALL_ORIGINS=True` in development only. |
| **Photo Proxy** | Ticket photos are never served directly from Azure. Django's `/api/photos/<path>/` endpoint generates a fresh SAS URL internally and streams the bytes — the Azure storage key is never exposed to the browser. |

---

## 📦 Data Models

### `User`
Extends `AbstractUser`. Fields: `role` (citizen / admin / superuser), `phone`, `email` (unique), `email_notifications`.

### `MaintenanceTicket`
Core entity. Fields: `title`, `description`, `category`, `status`, `location_description`, `lat`, `lng`, up to 5 photo fields, `reporter_name`, `reporter_email`, `reporter_user` (FK), `assigned_crew`, `escalated`, `escalation_level`, `escalation_note`, `escalated_at`, `escalated_by`.

### `AILog`
One-to-one with `MaintenanceTicket`. Written by `signals.py` after GPT-4o analysis. Fields: `assigned_crew`, `escalated`, `escalation_level`, `escalation_note`, `summary`, `decision`, `reasoning` (JSON), `confidence`, `status` (success / escalated / error), `model`, `raw_response` (JSON).

---

## 🗂️ API Surface

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register/` | public | Citizen registration |
| POST | `/api/auth/token/` | public | Login — returns JWT pair |
| POST | `/api/auth/token/refresh/` | public | Refresh access token |
| GET/PATCH | `/api/auth/profile/` | citizen | View / update own profile |
| GET | `/api/requests/` | public | List tickets (filterable) |
| POST | `/api/requests/` | public | Submit new ticket |
| GET | `/api/requests/<id>/` | public | Ticket detail |
| PATCH | `/api/requests/<id>/status/` | admin | Update ticket status |
| PATCH | `/api/requests/<id>/assign/` | admin | Reassign crew / escalate |
| DELETE | `/api/requests/<id>/delete/` | superuser | Hard delete |
| GET | `/api/requests/mine/` | citizen | Own tickets |
| GET | `/api/map/` | public | GPS-tagged tickets for map |
| GET | `/api/stats/` | public | Public homepage stats |
| GET | `/api/admin/stats/` | admin | Full breakdown by status/crew/category |
| GET | `/api/ai-log/` | admin | Real GPT-4o decisions |
| GET | `/api/photos/<path>/` | public | Proxied Azure blob photo |
| GET/POST/PATCH/DELETE | `/api/superuser/users/` | superuser | Full user CRUD |

---

## 🚀 Local Development

```bash
# 1. Clone and configure
cp .env.example .env          # fill in DB, Azure, OpenAI, Google Maps keys

# 2. Start all services
docker compose up --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
```

**Required environment variables:**

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Django signing key |
| `DB_*` | PostgreSQL connection |
| `AZURE_STORAGE_ACCOUNT_NAME` | Blob storage account |
| `AZURE_STORAGE_ACCOUNT_KEY` | Blob storage key |
| `OPENAI_API_KEY` | GPT-4o ticket analysis |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JS API |
| `EMAIL_HOST_PASSWORD` | SMTP credentials |
| `SUPERUSER_*` | Auto-created superadmin account |
