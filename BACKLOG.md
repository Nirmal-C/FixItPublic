# FixIt – Product Backlog

Items here are approved but not yet assigned to a sprint.

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
