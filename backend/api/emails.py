"""
api/emails.py
~~~~~~~~~~~~~
All transactional emails sent by FixIt Public.

Three triggers:
  1. send_welcome_email(user)              — fired on account registration
  2. send_ticket_confirmation(ticket)      — fired when a ticket is created
  3. send_ticket_status_update(ticket)     — fired when status changes

All emails are sent from info@fixitpublic.com via Django's built-in
send_mail() so the only config needed is SMTP env vars in settings.py.
Failures are caught and logged — a broken email must never break the API.
"""

import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

FROM_EMAIL  = 'FixIt Public <info@fixitpublic.com>'
SITE_URL    = getattr(settings, 'SITE_URL', 'https://fixitpublic.com')

# ── Crew metadata (mirrors models.py Crew choices) ────────────────────────────

CREW_INFO = {
    'crew-alpha':   {'name': 'Team Alpha',   'specialty': 'Roads & Footpaths'},
    'crew-bravo':   {'name': 'Team Bravo',   'specialty': 'Streetlights & Electrical'},
    'crew-charlie': {'name': 'Team Charlie', 'specialty': 'Parks & Green Spaces'},
    'crew-delta':   {'name': 'Team Delta',   'specialty': 'Graffiti Removal'},
    'crew-echo':    {'name': 'Team Echo',    'specialty': 'General Maintenance'},
}

STATUS_LABELS = {
    'pending':     'Pending Review',
    'in_progress': 'In Progress',
    'resolved':    'Resolved',
    'closed':      'Closed',
}

STATUS_COLOURS = {
    'pending':     '#f59e0b',
    'in_progress': '#3b82f6',
    'resolved':    '#10b981',
    'closed':      '#64748b',
}

STATUS_ICONS = {
    'pending':     '⏳',
    'in_progress': '🔧',
    'resolved':    '✅',
    'closed':      '🔒',
}

CATEGORY_LABELS = {
    'streetlight':   'Streetlight',
    'park':          'Park / Green Space',
    'footpath':      'Footpath',
    'road':          'Road / Pothole',
    'public_toilet': 'Public Toilet',
    'bus_stop':      'Bus Stop / Shelter',
    'graffiti':      'Graffiti',
    'other':         'Other',
}


# ── Shared HTML chrome ─────────────────────────────────────────────────────────

def _html_header(badge_text: str, badge_colour: str = '#0077C8') -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"
               style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header band -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 36px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      FixIt<span style="color:#0077C8;">Public</span>
                    </span>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;">
                      New Zealand Public Infrastructure Services
                    </p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:rgba(0,119,200,0.2);border:1px solid rgba(0,119,200,0.4);
                                 color:#60a5fa;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;letter-spacing:0.3px;">
                      {badge_text}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>"""


def _html_footer() -> str:
    return f"""
          <!-- Divider -->
          <tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px 32px;">
              <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;line-height:1.6;">
                You're receiving this email because you have an account on FixIt Public.
                If you didn't expect this email, please contact us at
                <a href="mailto:info@fixitpublic.com" style="color:#0077C8;">info@fixitpublic.com</a>.
              </p>
              <p style="margin:0;font-size:12px;color:#cbd5e1;">
                <strong style="color:#475569;">FixIt Public</strong>
                &nbsp;·&nbsp; New Zealand Public Infrastructure Services
                &nbsp;·&nbsp;
                <a href="mailto:info@fixitpublic.com" style="color:#0077C8;text-decoration:none;">
                  info@fixitpublic.com
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _ticket_details_block(ticket) -> str:
    category_label = CATEGORY_LABELS.get(ticket.category, ticket.category)
    tracking_url   = f"{SITE_URL}/track/{ticket.id}"
    return f"""
          <!-- Ticket details card -->
          <tr>
            <td style="padding:24px 36px 0;">
              <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Your Report
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                     style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom:10px;">
                          <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">Report ID</span>
                          <span style="font-size:13px;font-weight:600;color:#0f172a;font-family:monospace;">#{ticket.id}</span>
                        </td>
                        <td align="right" style="padding-bottom:10px;">
                          <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">Category</span>
                          <span style="font-size:12px;font-weight:600;color:#475569;">{category_label}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-bottom:10px;border-top:1px solid #e2e8f0;padding-top:10px;">
                          <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">Issue</span>
                          <span style="font-size:14px;font-weight:600;color:#1e293b;">{ticket.title}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:10px;">
                          <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">Location</span>
                          <span style="font-size:13px;color:#475569;">📍 {ticket.location_description or 'Not specified'}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Track button -->
          <tr>
            <td style="padding:24px 36px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="{tracking_url}"
                       style="display:inline-block;background:linear-gradient(135deg,#0077C8,#0062a8);color:#ffffff;
                              font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;
                              border-radius:10px;letter-spacing:0.2px;">
                      Track Your Report →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:8px;">
                    <span style="font-size:12px;color:#94a3b8;">
                      Or visit: <a href="{tracking_url}" style="color:#0077C8;text-decoration:underline;">{tracking_url}</a>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>"""


def _user_wants_email(user) -> bool:
    """Return True only if the user has opted in to email notifications."""
    return bool(getattr(user, 'email_notifications', False))


# ── 1. Welcome email ───────────────────────────────────────────────────────────

def send_welcome_email(user) -> None:
    """
    Sent immediately after a citizen registers — only if opted in.
    Confirms their account and encourages them to submit their first report.
    """
    if not user.email or not _user_wants_email(user):
        return

    name        = user.first_name or user.username
    subject     = 'Welcome to FixIt Public 👋'
    track_url   = f"{SITE_URL}/report"
    view_url    = f"{SITE_URL}/requests"

    html = _html_header('Welcome') + f"""

          <!-- Hero -->
          <tr>
            <td style="padding:36px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="display:inline-block;width:64px;height:64px;
                                background:linear-gradient(135deg,rgba(0,119,200,0.15),rgba(0,119,200,0.05));
                                border:2px solid rgba(0,119,200,0.35);border-radius:50%;
                                text-align:center;line-height:64px;">
                      <span style="font-size:28px;line-height:64px;">👋</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
                      Welcome, {name}!
                    </h1>
                    <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;max-width:420px;">
                      Your FixIt Public account is ready. Help keep New Zealand's public spaces safe and
                      well-maintained by reporting issues in your community.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:28px 36px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

          <!-- What you can do -->
          <tr>
            <td style="padding:24px 36px 0;">
              <p style="margin:0 0 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                What you can do
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom:12px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <span style="font-size:18px;">🚧</span>&nbsp;
                          <strong style="font-size:13px;color:#1e293b;">Report an issue</strong>
                          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">
                            Broken streetlights, potholes, graffiti, damaged park equipment — anything in your community.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <span style="font-size:18px;">📍</span>&nbsp;
                          <strong style="font-size:13px;color:#1e293b;">Track your reports</strong>
                          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">
                            Follow progress from submission through to resolved — and get email updates at every step.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <span style="font-size:18px;">🗺️</span>&nbsp;
                          <strong style="font-size:13px;color:#1e293b;">See community reports</strong>
                          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">
                            Browse all public reports in your area and see what's being worked on.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:28px 36px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-right:8px;" width="50%">
                    <a href="{track_url}"
                       style="display:block;background:linear-gradient(135deg,#0077C8,#0062a8);color:#ffffff;
                              font-size:13px;font-weight:700;text-decoration:none;padding:12px 20px;
                              border-radius:10px;text-align:center;">
                      Report an Issue →
                    </a>
                  </td>
                  <td align="center" style="padding-left:8px;" width="50%">
                    <a href="{view_url}"
                       style="display:block;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;
                              font-size:13px;font-weight:600;text-decoration:none;padding:12px 20px;
                              border-radius:10px;text-align:center;">
                      Browse Reports
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

    """ + _html_footer()

    plain = (
        f"Welcome to FixIt Public, {name}!\n\n"
        f"Your account is ready. You can now report public facility issues in your community,\n"
        f"track your reports, and see what's being worked on in your area.\n\n"
        f"Report an issue: {track_url}\n"
        f"Browse reports: {view_url}\n\n"
        f"Questions? Email us at info@fixitpublic.com"
    )

    _send(subject, plain, html, [user.email])


# ── 2. Ticket confirmation email ───────────────────────────────────────────────

def send_ticket_confirmation(ticket) -> None:
    """
    Sent immediately after a citizen submits a ticket.
    For authenticated users: only if they opted in.
    For anonymous users who provided an email: always send (they gave their email for this reason).
    """
    # Authenticated reporter — respect their preference
    if ticket.reporter_user:
        if not _user_wants_email(ticket.reporter_user):
            return
    # Anonymous reporter — they provided an email explicitly, so always notify
    email = _ticket_email(ticket)
    if not email:
        return

    name    = _ticket_name(ticket)
    subject = f'Report #{ticket.id} received – FixIt Public'
    crew    = CREW_INFO.get(ticket.assigned_crew, {})

    html = _html_header('Report Received') + f"""

          <!-- Hero -->
          <tr>
            <td style="padding:36px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="display:inline-block;width:64px;height:64px;
                                background:linear-gradient(135deg,rgba(0,119,200,0.15),rgba(0,119,200,0.05));
                                border:2px solid rgba(0,119,200,0.35);border-radius:50%;
                                text-align:center;line-height:64px;">
                      <span style="font-size:28px;line-height:64px;">📋</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
                      Report received, {name}!
                    </h1>
                    <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
                      We've logged your report and it's now in our AI triage queue.
                      You'll receive an update when a crew is assigned.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:28px 36px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

    """ + _ticket_details_block(ticket) + (f"""

          <!-- Crew assignment -->
          <tr>
            <td style="padding:20px 36px 0;">
              <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Assigned Crew
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                     style="background:linear-gradient(135deg,rgba(0,119,200,0.06),rgba(0,119,200,0.02));
                            border:1px solid rgba(0,119,200,0.2);border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="font-size:16px;font-weight:800;color:#0f172a;">{crew['name']}</span>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">{crew['specialty']}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
    """ if crew else """

          <!-- Pending triage notice -->
          <tr>
            <td style="padding:20px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                     style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                      ⏳ <strong style="color:#92400e;">Awaiting assignment</strong> —
                      Our AI triage system is reviewing your report. A maintenance crew will be assigned shortly
                      and you'll receive another email when that happens.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
    """) + f"""

          <!-- AI note -->
          <tr>
            <td style="padding:20px 36px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                     style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                      <strong style="color:#6366f1;">🤖 AI-Assisted Triage</strong> —
                      Your report is being analysed by our AI system which will assess priority,
                      match it to the right crew, and route it to the correct local authority.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

    """ + _html_footer()

    plain = (
        f"Hi {name},\n\n"
        f"We've received your report #{ticket.id}: {ticket.title}\n\n"
        f"Location: {ticket.location_description or 'Not specified'}\n"
        f"Status: Pending Review\n\n"
        f"Track your report: {SITE_URL}/track/{ticket.id}\n\n"
        f"You'll receive another email when a crew is assigned or the status changes.\n\n"
        f"Questions? Email info@fixitpublic.com"
    )

    _send(subject, plain, html, [email])


# ── 3. Status update email ─────────────────────────────────────────────────────

def send_ticket_status_update(ticket, old_status: str = None) -> None:
    """
    Sent whenever a ticket's status changes or a crew is (re-)assigned.
    For authenticated users: only if they opted in.
    For anonymous users who provided an email: always send.
    """
    if ticket.reporter_user:
        if not _user_wants_email(ticket.reporter_user):
            return
    email = _ticket_email(ticket)
    if not email:
        return

    name         = _ticket_name(ticket)
    status_label = STATUS_LABELS.get(ticket.status, ticket.status)
    status_color = STATUS_COLOURS.get(ticket.status, '#64748b')
    status_icon  = STATUS_ICONS.get(ticket.status, '📋')
    crew         = CREW_INFO.get(ticket.assigned_crew, {})

    subject = f'Report #{ticket.id} update: {status_label} – FixIt Public'

    # Human-readable message per status
    status_messages = {
        'pending':     "Your report is in the queue and will be assigned to a maintenance crew shortly.",
        'in_progress': "Great news — a maintenance crew has been assigned and work is underway on your report.",
        'resolved':    "Your report has been marked as resolved. Thank you for helping keep your community safe!",
        'closed':      "Your report has been closed. If the issue persists, please submit a new report.",
    }
    status_message = status_messages.get(ticket.status, "Your report has been updated.")

    html = _html_header(status_label) + f"""

          <!-- Hero -->
          <tr>
            <td style="padding:36px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="display:inline-block;width:64px;height:64px;
                                background:linear-gradient(135deg,rgba(0,119,200,0.15),rgba(0,119,200,0.05));
                                border:2px solid rgba(0,119,200,0.35);border-radius:50%;
                                text-align:center;line-height:64px;">
                      <span style="font-size:28px;line-height:64px;">{status_icon}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
                      Report #{ticket.id} updated
                    </h1>
                    <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
                      {status_message}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:28px 36px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

          <!-- Status badge -->
          <tr>
            <td style="padding:24px 36px 0;">
              <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Current Status
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:{status_color}1a;border:1px solid {status_color}4d;
                             border-radius:8px;padding:8px 16px;">
                    <span style="font-size:13px;font-weight:700;color:{status_color};">
                      {status_icon} {status_label}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

    """ + _ticket_details_block(ticket) + (f"""

          <!-- Crew assignment -->
          <tr>
            <td style="padding:20px 36px 0;">
              <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Assigned Crew
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                     style="background:linear-gradient(135deg,rgba(0,119,200,0.06),rgba(0,119,200,0.02));
                            border:1px solid rgba(0,119,200,0.2);border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="font-size:16px;font-weight:800;color:#0f172a;">{crew['name']}</span>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b;">{crew['specialty']}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
    """ if crew else "") + f"""

          <tr><td style="padding-bottom:12px;"></td></tr>

    """ + _html_footer()

    plain = (
        f"Hi {name},\n\n"
        f"Your report #{ticket.id} has been updated.\n\n"
        f"Title: {ticket.title}\n"
        f"Status: {status_label}\n"
        f"Location: {ticket.location_description or 'Not specified'}\n"
        + (f"Assigned crew: {crew['name']} ({crew['specialty']})\n" if crew else "")
        + f"\nTrack your report: {SITE_URL}/track/{ticket.id}\n\n"
        f"Questions? Email info@fixitpublic.com"
    )

    _send(subject, plain, html, [email])


# ── 4. Sign-in notification email ─────────────────────────────────────────────

def send_signin_notification(user) -> None:
    """
    Sent on every successful login — only if the user has opted in.
    Serves as a security notice so users know when their account is accessed.
    """
    if not user.email or not _user_wants_email(user):
        return

    name        = user.first_name or user.username
    subject     = 'New sign-in to your FixIt Public account'
    profile_url = f"{SITE_URL}/track"

    from django.utils import timezone
    signed_in_at = timezone.now().strftime('%d %b %Y at %H:%M UTC')

    html = _html_header('Sign-In Alert') + f"""

          <!-- Hero -->
          <tr>
            <td style="padding:36px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="display:inline-block;width:64px;height:64px;
                                background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05));
                                border:2px solid rgba(99,102,241,0.35);border-radius:50%;
                                text-align:center;line-height:64px;">
                      <span style="font-size:28px;line-height:64px;">🔐</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">
                      New sign-in, {name}
                    </h1>
                    <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
                      A new sign-in to your FixIt Public account was detected.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:28px 36px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>

          <!-- Details card -->
          <tr>
            <td style="padding:24px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                     style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom:10px;">
                          <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">Account</span>
                          <span style="font-size:13px;font-weight:600;color:#0f172a;">{user.username}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e2e8f0;padding-top:10px;">
                          <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px;">Time</span>
                          <span style="font-size:13px;color:#475569;">{signed_in_at}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:20px 36px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                     style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                      ⚠️ <strong style="color:#92400e;">Wasn't you?</strong>
                      If you didn't sign in, your account may be compromised.
                      Please contact us immediately at
                      <a href="mailto:info@fixitpublic.com" style="color:#0077C8;">info@fixitpublic.com</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

    """ + _html_footer()

    plain = (
        f"Hi {name},\n\n"
        f"A new sign-in to your FixIt Public account ({user.username}) was detected at {signed_in_at}.\n\n"
        f"If this wasn't you, please contact us immediately at info@fixitpublic.com.\n\n"
        f"View your reports: {profile_url}"
    )

    _send(subject, plain, html, [user.email])


# ── Internal helpers ───────────────────────────────────────────────────────────

def _ticket_email(ticket) -> str | None:
    """
    Return the best available email address for a ticket reporter.
    Priority: authenticated account email > anonymous reporter_email field.
    Returns None if no email is available (fully anonymous report).
    """
    if ticket.reporter_user and ticket.reporter_user.email:
        return ticket.reporter_user.email
    if ticket.reporter_email:
        return ticket.reporter_email
    return None


def _ticket_name(ticket) -> str:
    """Return a friendly first name for the reporter."""
    if ticket.reporter_user:
        return ticket.reporter_user.first_name or ticket.reporter_user.username
    if ticket.reporter_name:
        return ticket.reporter_name
    return 'there'


def _send(subject: str, plain: str, html: str, to: list[str]) -> None:
    """Send an email, catching and logging all failures silently."""
    try:
        send_mail(
            subject=subject,
            message=plain,
            from_email=FROM_EMAIL,
            recipient_list=to,
            html_message=html,
            fail_silently=False,
        )
        logger.info('Email sent: "%s" → %s', subject, to)
    except Exception as exc:
        logger.error('Email failed: "%s" → %s | %s', subject, to, exc)
