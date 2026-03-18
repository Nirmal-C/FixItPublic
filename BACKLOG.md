# FixIt – Product Backlog

Items here are approved but not yet assigned to a sprint.

---

## Email Notifications

**Priority:** Medium
**Effort:** Medium (frontend small, backend significant)

Allow users to opt in to email notifications at registration and receive automated emails for key account and ticket events.

### Acceptance Criteria

- [ ] Register form includes an opt-in checkbox: "Notify me by email about my tickets and account activity"
- [ ] User model stores `email_notifications` boolean (default `false`), requires migration
- [ ] Welcome email sent on successful registration (if opted in)
- [ ] Sign-in notification email sent on successful login (if opted in)
- [ ] Ticket created confirmation email sent to reporter (if opted in)
- [ ] Ticket update email sent when status or assigned crew changes (if opted in)
- [ ] Emails use HTML templates with the FixIt branding
- [ ] Users who did not opt in receive no emails

### Technical Notes

- Backend: Django email backend — recommend SendGrid (`django-sendgrid-v5`) or SMTP via Gmail for simplicity
- Hook emails into: `post_save` signal on `User` (welcome), login view (sign-in), `post_save` signal on `MaintenanceTicket` (created + updated)
- Store opt-in preference on the custom user model or a related profile model
- Frontend: add checkbox to `RegisterPage.jsx`, send `email_notifications` field in registration payload
- Need `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` in Django settings / environment variables

---
