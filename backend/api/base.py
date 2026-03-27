"""
api/base.py
~~~~~~~~~~~
Abstract base classes and reusable model mixins for the FixItPublic backend.

Demonstrates core OOP principles:

  Abstraction     — NotificationService and CrewAssignmentStrategy define
                    contracts without dictating implementation details.
  Inheritance     — TimestampedModel is an abstract Django model; concrete
                    models inherit the audit-timestamp fields from it.
  Encapsulation   — Each class exposes only what callers need; internal
                    Django plumbing stays hidden behind the interface.
  Polymorphism    — Any class that inherits NotificationService and
                    implements send() / send_bulk() is a valid notification
                    channel (email today, SMS or push tomorrow).
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from django.db import models

logger = logging.getLogger(__name__)


# ── Abstract model mixin ────────────────────────────────────────────────────

class TimestampedModel(models.Model):
    """
    Abstract base model that automatically stamps every record with
    created_at and updated_at timestamps.

    Inherit from this instead of models.Model for any new model that
    needs audit timestamps, to avoid repeating the same two field
    definitions everywhere.

    Usage::

        class Notification(TimestampedModel):
            message = models.TextField()
            # created_at and updated_at inherited automatically
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


# ── Notification abstraction ────────────────────────────────────────────────

class NotificationService(ABC):
    """
    Abstract base class defining the contract every notification channel
    must fulfil.

    The application code depends on this interface, not on a specific
    transport (SMTP, SMS, push, etc.).  Swapping the delivery mechanism
    in tests or at runtime requires only a different concrete subclass.

    Subclasses must implement:
        send()       — deliver a single notification
        send_bulk()  — deliver the same notification to many recipients
    """

    @abstractmethod
    def send(self, recipient, subject: str, body: str, **kwargs) -> bool:
        """
        Send a notification to a single recipient.

        Args:
            recipient:  A User instance (or any object with an .email attribute).
            subject:    Subject / title line.
            body:       Full message body (plain text or HTML depending on channel).
            **kwargs:   Channel-specific options (e.g. html_message, attachments).

        Returns:
            True on success, False on failure.  Must never raise — errors
            should be caught internally and logged.
        """

    @abstractmethod
    def send_bulk(self, recipients, subject: str, body: str, **kwargs) -> int:
        """
        Send the same notification to an iterable of recipients.

        Returns:
            The number of successfully delivered notifications.
        """


class EmailNotificationService(NotificationService):
    """
    Concrete SMTP-based implementation of NotificationService.

    Wraps Django's send_mail() so the rest of the codebase never
    imports it directly.  Failures are caught and logged — a broken
    SMTP connection must never take down an API endpoint.
    """

    def send(self, recipient, subject: str, body: str, **kwargs) -> bool:
        from django.conf import settings
        from django.core.mail import send_mail

        html_message = kwargs.get('html_message', body)
        from_email   = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@fixitpublic.com')
        try:
            send_mail(
                subject,
                body,
                from_email,
                [recipient.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.debug('Email sent to %s — "%s"', recipient.email, subject)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error('Email delivery failed for %s: %s', recipient.email, exc)
            return False

    def send_bulk(self, recipients, subject: str, body: str, **kwargs) -> int:
        sent = 0
        for recipient in recipients:
            if self.send(recipient, subject, body, **kwargs):
                sent += 1
        logger.info('Bulk email — %d/%d delivered for "%s"', sent, sent, subject)
        return sent
