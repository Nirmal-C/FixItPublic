"""
api/strategies.py
~~~~~~~~~~~~~~~~~
Strategy pattern implementations for crew assignment logic.

The Strategy pattern lets the crew-assignment algorithm vary independently
from the ticket creation workflow.  The view/service calls
``strategy.assign(ticket)`` and has no knowledge of which algorithm runs —
it just gets back a crew identifier string.

Current strategies
------------------
CategoryBasedAssignment
    Maps ticket category to a crew using a static lookup table.
    This is the default strategy used at ticket creation time.

AIEnhancedAssignment
    Defers to the GPT-4o AI log entry if one already exists for the
    ticket, falling back to CategoryBasedAssignment otherwise.  Useful
    for admin review workflows that want to surface the AI decision.

Adding a new strategy
---------------------
1. Subclass ``CrewAssignmentStrategy`` and implement ``assign()``.
2. Pass the new strategy instance to wherever crew assignment is needed.
   No other code changes required — this is the whole point of the pattern.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

# ── Lookup table (mirrors models.py CATEGORY_CREW_MAP) ─────────────────────
# Defined here so strategies.py is self-contained and can be imported
# without pulling in the full models module.
_CATEGORY_CREW_MAP: dict[str, str] = {
    'streetlight':   'crew-bravo',
    'road':          'crew-alpha',
    'footpath':      'crew-alpha',
    'park':          'crew-charlie',
    'graffiti':      'crew-delta',
    'bus_stop':      'crew-echo',
    'public_toilet': 'crew-echo',
    'other':         'crew-echo',
}

_DEFAULT_CREW = 'crew-echo'


# ── Abstract base strategy ──────────────────────────────────────────────────

class CrewAssignmentStrategy(ABC):
    """
    Abstract base class for all crew-assignment strategies.

    Defines the interface: given a ticket, return the string identifier
    of the crew that should handle it.  Concrete strategies encapsulate
    the decision logic so it is easy to swap, test, or extend.
    """

    @abstractmethod
    def assign(self, ticket) -> str:
        """
        Determine the appropriate crew for a ticket.

        Args:
            ticket: A MaintenanceTicket instance (or duck-typed equivalent
                    with at least a .category attribute).

        Returns:
            A crew identifier string, e.g. ``'crew-alpha'``.
            Must never raise — return the default crew on unexpected input.
        """


# ── Concrete strategy 1 — category lookup ──────────────────────────────────

class CategoryBasedAssignment(CrewAssignmentStrategy):
    """
    Assigns crew purely based on ticket category.

    This is the primary strategy used at ticket creation time before
    the AI analysis has run.  It uses the same lookup table as the
    original inline code, extracted here so the logic is testable
    and reusable in isolation.
    """

    def assign(self, ticket) -> str:
        category = getattr(ticket, 'category', None) or ''
        crew = _CATEGORY_CREW_MAP.get(category, _DEFAULT_CREW)
        logger.debug(
            'CategoryBasedAssignment: ticket category=%r → crew=%r',
            category, crew,
        )
        return crew


# ── Concrete strategy 2 — AI-enhanced ──────────────────────────────────────

class AIEnhancedAssignment(CrewAssignmentStrategy):
    """
    Prefers the GPT-4o AI log decision when available.

    If a completed AILog entry exists for the ticket and carries a crew
    assignment, that value takes precedence.  Otherwise falls back to
    CategoryBasedAssignment to guarantee a result is always returned.

    This strategy is appropriate for admin reassignment workflows where
    the AI has already processed the ticket.
    """

    _fallback: CrewAssignmentStrategy = CategoryBasedAssignment()

    def assign(self, ticket) -> str:
        try:
            ai_log = getattr(ticket, 'ai_log', None)
            if ai_log is not None and ai_log.assigned_crew:
                logger.debug(
                    'AIEnhancedAssignment: using AI decision crew=%r for ticket #%s',
                    ai_log.assigned_crew, ticket.pk,
                )
                return ai_log.assigned_crew
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                'AIEnhancedAssignment: could not read ai_log for ticket #%s (%s), '
                'falling back to category-based assignment',
                getattr(ticket, 'pk', '?'), exc,
            )
        return self._fallback.assign(ticket)
