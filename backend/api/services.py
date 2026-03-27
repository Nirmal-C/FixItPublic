"""
api/services.py
~~~~~~~~~~~~~~~
Service layer for ticket lifecycle operations.

Moves orchestration logic out of views and into a dedicated class so that:

  * Views stay thin — they validate input and delegate; they do not
    contain business rules.
  * Business logic is testable without an HTTP request context.
  * The same operations can be called from signals, management commands,
    or future API versions without duplicating code.

OOP concepts demonstrated
--------------------------
Encapsulation   — internal helpers (GPS extraction, crew assignment)
                  are private to the service; callers use the public
                  classmethod interface only.
Composition     — TicketService composes strategy objects rather than
                  inheriting from them, keeping concerns separate.
Single Responsibility
                — Each method does exactly one thing; the class does not
                  touch HTTP, serialization, or template rendering.
"""

from __future__ import annotations

import logging

from .strategies import CategoryBasedAssignment, CrewAssignmentStrategy
from .utils import extract_gps_exif

logger = logging.getLogger(__name__)

# Module-level strategy instance — swappable for tests or future AI-driven assignment.
_crew_strategy: CrewAssignmentStrategy = CategoryBasedAssignment()


class TicketService:
    """
    Coordinates the full ticket lifecycle: creation, GPS backfill,
    crew assignment, status transitions, and notifications.

    All methods are classmethods because TicketService holds no mutable
    per-instance state; it exists purely as a namespace for related
    operations.  If future requirements introduce per-request context
    (e.g. the requesting user's locale), the class can be instantiated
    instead without changing the call sites.
    """

    # ── Creation helpers ────────────────────────────────────────────────────

    @classmethod
    def assign_crew(cls, ticket, strategy: CrewAssignmentStrategy | None = None) -> str:
        """
        Assign a maintenance crew to the ticket using the given strategy.

        If no strategy is provided, the module-level default
        (CategoryBasedAssignment) is used.

        Args:
            ticket:   A saved MaintenanceTicket instance.
            strategy: Optional override — pass an AIEnhancedAssignment
                      instance to prefer the GPT-4o decision.

        Returns:
            The crew identifier string that was assigned and persisted.
        """
        effective_strategy = strategy or _crew_strategy
        crew = effective_strategy.assign(ticket)
        if ticket.assigned_crew != crew:
            ticket.assigned_crew = crew
            ticket.save(update_fields=['assigned_crew'])
            logger.debug('TicketService.assign_crew: ticket #%s → %s', ticket.pk, crew)
        return crew

    @classmethod
    def backfill_gps_from_exif(cls, ticket) -> bool:
        """
        Attempt to extract GPS coordinates from photo EXIF data when the
        citizen did not supply them explicitly.

        Iterates through all five photo slots and stops at the first photo
        that contains valid GPS metadata.

        Args:
            ticket: A saved MaintenanceTicket instance.

        Returns:
            True if coordinates were found and persisted; False otherwise.
        """
        if ticket.lat is not None and ticket.lng is not None:
            return False  # already have coordinates — nothing to do

        for field_name in ('photo', 'photo2', 'photo3', 'photo4', 'photo5'):
            photo_field = getattr(ticket, field_name, None)
            if not photo_field:
                continue
            coords = extract_gps_exif(photo_field)
            if coords:
                ticket.lat, ticket.lng = coords
                ticket.save(update_fields=['lat', 'lng'])
                logger.debug(
                    'TicketService.backfill_gps_from_exif: ticket #%s GPS from %s → (%s, %s)',
                    ticket.pk, field_name, ticket.lat, ticket.lng,
                )
                return True

        return False

    @classmethod
    def finalise_new_ticket(cls, ticket) -> None:
        """
        Run all post-creation steps for a freshly saved ticket.

        Called by TicketListCreateView.perform_create() after the
        serializer has persisted the record.  Keeps the view method
        to a single line of delegation.

        Steps:
          1. Backfill GPS from EXIF if coordinates are missing.
          2. Send the confirmation email to the reporter.
        """
        from .emails import send_ticket_confirmation

        cls.backfill_gps_from_exif(ticket)
        send_ticket_confirmation(ticket)
        logger.info('TicketService.finalise_new_ticket: ticket #%s finalised', ticket.pk)

    # ── Status transition ───────────────────────────────────────────────────

    @classmethod
    def handle_status_transition(cls, ticket, old_status: str) -> None:
        """
        Trigger side-effects after a ticket status change.

        Currently sends a status-update email to the reporter when
        the status has genuinely changed.  Future side-effects
        (push notifications, webhooks, audit log writes) can be added
        here without touching the view.

        Args:
            ticket:     The MaintenanceTicket instance *after* the update.
            old_status: The status value *before* the update.
        """
        from .emails import send_ticket_status_update

        if ticket.status != old_status:
            send_ticket_status_update(ticket, old_status=old_status)
            logger.info(
                'TicketService.handle_status_transition: ticket #%s %s → %s',
                ticket.pk, old_status, ticket.status,
            )
