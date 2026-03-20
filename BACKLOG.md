# FixIt – Product Backlog

Items here are approved.

---

## Email Notifications

**Priority:** Medium
**Effort:** Medium (frontend small, backend significant)
**Status:** ✅ Implemented

Allow users to opt in to email notifications at registration and receive automated emails for key account and ticket events.

### Acceptance Criteria

- [x] Register form includes an opt-in checkbox: "Notify me by email about my tickets and account activity"
- [x] User model stores `email_notifications` boolean (default `false`), requires migration
- [x] Welcome email sent on successful registration (if opted in)
- [x] Sign-in notification email sent on successful login (if opted in)
- [x] Ticket created confirmation email sent to reporter (if opted in / or anonymous with email provided)
- [x] Ticket update email sent when status or assigned crew changes (if opted in / or anonymous with email provided)
- [x] Emails use HTML templates with the FixIt branding
- [x] Users who did not opt in receive no emails

### Technical Notes

- Backend: Django SMTP email backend — configured for `mail.privateemail.com:587` (Private Email)
- `send_welcome_email`, `send_signin_notification`, `send_ticket_confirmation`, `send_ticket_status_update` all live in `api/emails.py`
- All sends are gated on `user.email_notifications` for authenticated users; anonymous users who provided an email always receive ticket emails
- SMTP credentials set via env vars: `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- Migration: `0007_user_email_notifications.py`

---


## Google Maps Integration

**Priority:** High
**Effort:** Medium
**Status:** ✅ Implemented

Embed interactive Google Maps across the platform so citizens can pinpoint issue locations when reporting, and admins can visualise and manage all tickets spatially.

### Acceptance Criteria

- [x] Citizens can pick an exact location on a map when submitting a report
- [x] Picked coordinates (lat/lng) are stored against the ticket
- [x] Public map shows all GPS-tagged tickets as colour-coded pins by category
- [x] Clicking a pin opens an info window with ticket title, status, category, location, and date
- [x] Public map supports filtering by category and status
- [x] Admin map shows the same pins with full detail — reporter name, assigned crew, escalation flag
- [x] Escalated tickets display a red alert badge on their pin in the admin map
- [x] Admin map includes map type toggle (Roadmap / Satellite / Hybrid / Terrain)
- [x] Admin map includes quick status-change buttons inside the detail panel
- [x] Admin map shows a status count strip (clickable to filter)
- [x] Admin map lists unmapped tickets in a collapsible accordion
- [x] Map styling adapts to light/dark theme
- [x] Google Maps script is loaded asynchronously — page is not blocked if the API is slow
- [x] API key is read from `VITE_GOOGLE_MAPS_API_KEY` environment variable

### Technical Notes

- `components/PublicMap.jsx` — citizen-facing map; loads Maps JS API via dynamic script injection with a promise-cached loader (`gmapsReady`)
- `components/AdminMap.jsx` — admin-facing map; extends PublicMap with crew/reporter detail, escalation badges, map type control, and inline status updates
- `components/LocationPickerModal.jsx` — modal with a draggable marker for selecting coordinates during ticket submission; defaults to Auckland CBD (`-36.8485, 174.7633`)
- `utils/googleMapStyles.js` — custom map style arrays for light and dark themes
- `api/views.py` — `GET /api/map/` returns all GPS-tagged tickets; public callers get the PII-safe `MapTicketSerializer`, admins get full detail
- `VITE_GOOGLE_MAPS_API_KEY` must be set in `.env` — without it the map renders a grey box with an error overlay

---

## Separate Admin and Citizen Authentication Flows

**Priority:** High
**Effort:** Small
**Status:** ✅ Implemented

Admins had no clear entry point from the public home page and could accidentally submit credentials through the citizen `/login` portal, resulting in silent failures or confusing error messages.

### Acceptance Criteria

- [x] Home page hero includes a subtle "Council / Admin Sign In" link that routes to `/admin/login`
- [x] Admin accounts are blocked from logging in via the citizen portal
- [x] If an admin enters credentials at `/login`, a gold "Admin account detected" banner appears with a direct link to `/admin/login`
- [x] Both error states clear when the user edits any field
- [x] Admin tokens are never written to `localStorage` during a citizen login attempt
- [x] Authenticated admins visiting `/` are redirected to `/admin` automatically

### Technical Notes

- `CitizenAuthContext.jsx` — `login()` decodes the JWT before persisting; throws `err.isAdminRole = true` for admin/superuser roles
- `LoginPage.jsx` — catches `isAdminRole` and renders the redirect banner instead of the generic red error
- `HomePage.jsx` — `KeyRound` admin link added below the main CTA buttons; `HomeRedirect` component added to `App.jsx` for the `/` redirect
- No new dependencies

---

## GPT-4o Ticket Analysis (Real AI Log)

**Priority:** High
**Effort:** Medium (backend significant, frontend small)
**Status:** ✅ Implemented

Replace the mock AI Log page (which generated fake data client-side) with a real GPT-4o pipeline that automatically analyses every new ticket, reassigns crew if needed, decides on escalation, and logs the decision for admin review.

### Acceptance Criteria

- [x] Every new ticket triggers GPT-4o analysis automatically on creation
- [x] GPT-4o confirms or reassigns the crew based on the full ticket description
- [x] GPT-4o decides whether to escalate and to what level (senior_engineer / council_manager / emergency)
- [x] GPT-4o writes a one-line summary and step-by-step reasoning with a confidence score
- [x] Ticket fields (`assigned_crew`, `escalated`, `escalation_level`, `escalation_note`) are updated in-place
- [x] Every decision is persisted in the `AILog` table and visible on the Admin → AI Log page
- [x] Analysis runs in a background thread — citizen's HTTP response is never delayed
- [x] If `OPENAI_API_KEY` is not set, analysis is skipped gracefully (logged, no crash)
- [x] If GPT-4o returns an invalid crew or escalation level, the response is sanitised before saving
- [x] Error entries are written to `AILog` if the API call fails, so admins can see what went wrong
- [x] Admin AI Log page shows real data (summary, decision, reasoning, confidence, crew, model tag)
- [x] AI Log page supports filtering by status (success / escalated / error) and category

### Technical Notes

- `api/signals.py` — new file; `post_save` signal spawns a daemon thread that calls OpenAI and writes the result via Django ORM
- `api/apps.py` — `ready()` registers the signal
- `api/models.py` — new `AILog` model (OneToOne with `MaintenanceTicket`)
- `api/migrations/0008_ailog.py` — migration for `AILog`
- `api/serializers.py` — `AILogSerializer` added
- `api/views.py` — `AILogListView` added (`GET /api/ai-log/`, admin-only)
- `api/urls.py` — `/api/ai-log/` route added
- `core/settings.py` — `OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')` added
- `backend/requirements.txt` — `openai` added
- `.env` — `OPENAI_API_KEY=sk-...` placeholder added
- `frontend/src/api/client.js` — `aiLogApi.list()` added
- `frontend/src/pages/admin/AILogPage.jsx` — rewritten to fetch real data; mock generation removed
- No new Docker containers — runs entirely within the existing backend container

---

## Citizen Profile Management & Avatar Upload

**Priority:** High
**Effort:** Medium
**Status:** ✅ Implemented

Allow authenticated citizens to view and edit their own profile information and upload a profile photo that persists reliably across page refreshes and sessions.

### Acceptance Criteria

- [x] Citizen dashboard displays profile info: name, email, phone, join date
- [x] Edit mode lets the citizen update first name, last name, username, email, and phone
- [x] Username and email are validated (min length, format, uniqueness) before saving
- [x] Email notifications toggle (bell icon) persists to the database and survives page refresh
- [x] Camera button opens file picker — accepts JPG, PNG, WebP, GIF up to 5 MB
- [x] Uploading a new photo shows a local preview instantly (before the upload finishes)
- [x] Avatar is stored in Azure Blob Storage under `avatars/` prefix
- [x] After upload, the photo displays correctly without a page refresh
- [x] After page refresh, the photo still displays correctly (no initials flash)
- [x] After logout and re-login, the photo still displays correctly
- [x] If the user has no avatar, their username initial is shown as a fallback
- [x] Uploading a second photo replaces the first (old blob is deleted from Azure)
- [x] Files larger than 5 MB show a clear error message and are rejected
- [x] Non-image file types show a clear error message and are rejected
- [x] Password change section validates current password, enforces 8-char minimum, checks confirm match
- [x] Password strength indicator updates in real time (weak / fair / strong)

### QA Test Cases

| # | Scenario | Expected Result |
|---|---|---|
| 1 | Upload a photo, stay on page | Photo displays immediately via local preview |
| 2 | Upload a photo, hard refresh (F5) | Photo still shows — loaded via `/api/auth/avatar/` proxy |
| 3 | Upload a photo, logout, login again | Photo still shows after re-login |
| 4 | Upload a photo > 5 MB | Error banner: "Avatar must be smaller than 5 MB." |
| 5 | Upload a non-image file (e.g. `.pdf`) | Error banner: "Please upload a JPG, PNG, WebP, or GIF image." |
| 6 | Edit name + save | Dashboard shows updated name; changes survive refresh |
| 7 | Toggle email notifications off, refresh | Toggle remains off |
| 8 | Change password with mismatched confirm | "Passwords do not match." error, no API call made |
| 9 | Change password with wrong current password | Backend 400 error displayed to user |
| 10 | Access `/dashboard` unauthenticated | Redirect to `/login` |
| 11 | Submit profile edit with username < 3 chars | Inline validation error before API call |
| 12 | Submit profile edit with duplicate email | Backend 400 error displayed to user |

### Technical Notes

- `GET /api/auth/avatar/` — new proxy endpoint; fetches the blob from Azure server-side using a fresh SAS URL and streams raw bytes back to the browser. Avoids SAS URL expiry in the browser entirely.
- `POST /api/auth/avatar/` — existing upload endpoint; returns `{ avatar_url }`.
- `frontend/src/pages/CitizenDashboardPage.jsx` — avatar loaded via `authApi.avatarBlob()` (axios responseType `blob`) into a local `URL.createObjectURL` blob URL. Re-fetches after every upload (`avatarSaving` toggle).
- `frontend/src/contexts/CitizenAuthContext.jsx` — `cacheAvatar()` persists `avatar_url` to `pfmrs_citizen_profile` in `localStorage` so it survives token refresh cycles.
- Azure SAS expiry changed from 3 600 s → 86 400 s (24 h) as a secondary safeguard.

---

## Admin User Edit Drawer — Z-index / Stacking Context Fix

**Priority:** High
**Effort:** Small
**Status:** ✅ Implemented

The user-edit slide-over panel in the Admin → Users page was "bleeding through" the admin sidebar and top navigation bar due to CSS stacking context trapping caused by `transform` + `transition-all` on the sidebar element.

### Acceptance Criteria

- [x] Clicking "Edit" on any user row opens a right-side drawer
- [x] The drawer renders on top of all admin UI elements (sidebar, header, any modals)
- [x] The backdrop darkens the rest of the page
- [x] Clicking the backdrop closes the drawer
- [x] Pressing Escape closes the drawer
- [x] The delete confirmation modal also renders above all elements
- [x] The drawer does not bleed through the sidebar or top navigation at any viewport width
- [x] Drawer opens and closes without visual artifacts or z-index conflicts

### QA Test Cases

| # | Scenario | Expected Result |
|---|---|---|
| 1 | Click Edit on a user row | Drawer slides in from the right, fully above sidebar |
| 2 | Open drawer, scroll sidebar | Drawer stays on top |
| 3 | Click backdrop | Drawer closes smoothly |
| 4 | Press Escape key while drawer is open | Drawer closes |
| 5 | Click Delete inside drawer | Delete confirmation modal appears above the drawer |
| 6 | Dismiss delete modal with Escape | Modal closes; drawer remains open |
| 7 | Resize window to mobile width | Drawer fills full width, still above all nav elements |
| 8 | Open drawer, toggle dark/light theme | Drawer background and text update correctly |

### Technical Notes

- `frontend/src/pages/admin/UsersPage.jsx` — `EditDrawer` and `DeleteModal` both use the native `<dialog>` element with `.showModal()`. The HTML `dialog` element is placed in the browser's **top layer**, which is above all CSS stacking contexts regardless of z-index or CSS transforms on parent elements.
- `frontend/src/index.css` — `dialog::backdrop { background: rgba(0,0,0,0.65); }` styles the browser-managed backdrop.
- No `createPortal` or z-index escalation required — the browser handles layering natively.

---
