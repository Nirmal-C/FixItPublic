"""
signals.py
----------
Fires after a MaintenanceTicket is created.
Calls OpenAI GPT-4o directly in a background thread so the HTTP response
to the citizen is never delayed waiting for the LLM.

Flow
----
1. Ticket saved → post_save fires
2. Background thread calls GPT-4o with ticket details
3. GPT-4o returns crew assignment, escalation decision, summary, reasoning
4. Thread updates the ticket fields and writes an AILog row via Django ORM
"""

import json
import logging
import threading
import os

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import MaintenanceTicket
from .utils import redact_pii
from .cultural_guardian import check_cultural_sensitivity

logger = logging.getLogger(__name__)

# Valid crew IDs — must match MaintenanceTicket.Crew choices in models.py
CREW_INFO = {
    'crew-alpha':   'Team Alpha — Roads & Footpaths',
    'crew-bravo':   'Team Bravo — Streetlights & Electrical',
    'crew-charlie': 'Team Charlie — Parks & Green Spaces',
    'crew-delta':   'Team Delta — Graffiti Removal',
    'crew-echo':    'Team Echo — General Maintenance',
}

VALID_ESCALATION_LEVELS = ['senior_engineer', 'council_manager', 'emergency']

SYSTEM_PROMPT = """You are an AI assistant for FixItPublic, a New Zealand public
infrastructure maintenance system. You analyse incoming maintenance tickets and make
three decisions:

1. CREW ASSIGNMENT — confirm or reassign the crew best suited to the ticket.
   Available crews:
   - crew-alpha:   Roads & Footpaths
   - crew-bravo:   Streetlights & Electrical
   - crew-charlie: Parks & Green Spaces
   - crew-delta:   Graffiti Removal
   - crew-echo:    General Maintenance (default for unclear cases)

2. ESCALATION — decide if the ticket needs escalation beyond a standard crew.
   Escalate if: safety risk, structural damage, offensive content, or high public impact.
   Escalation levels: senior_engineer, council_manager, emergency
   If no escalation needed, set escalated to false and escalation_level to "".

3. SUMMARY — write one clear sentence describing the issue.

Respond ONLY with a JSON object in this exact shape:
{
  "assigned_crew":    "crew-alpha",
  "escalated":        false,
  "escalation_level": "",
  "escalation_note":  "",
  "summary":          "One sentence describing the issue.",
  "decision":         "Brief explanation of your crew and escalation choices.",
  "reasoning": [
    "Step 1 reasoning",
    "Step 2 reasoning",
    "Step 3 reasoning",
    "Step 4 reasoning"
  ],
  "confidence": 0.92
}

Keep reasoning to 3-5 concise bullet points. Do not include any text outside the JSON object."""


def _analyse_and_save(ticket_id: int) -> None:
    """
    Runs in a background thread.
    Fetches the ticket, calls GPT-4o, updates the ticket fields,
    and writes an AILog row — all via Django ORM directly.
    """
    from openai import OpenAI
    from .models import MaintenanceTicket, AILog

    try:
        ticket = MaintenanceTicket.objects.get(pk=ticket_id)
    except MaintenanceTicket.DoesNotExist:
        logger.error('Signal: ticket #%s not found', ticket_id)
        return

    # ── Get API key from environment ──────────────────────────────────────────
    api_key = os.environ.get('OPENAI_API_KEY')

    if not api_key:
        logger.warning(
            'OPENAI_API_KEY not set — skipping AI analysis for ticket #%s',
            ticket_id
        )
        return

    client = OpenAI(api_key=api_key)

    # Redact PII before sending any text to OpenAI — DB values are unchanged
    safe_title       = redact_pii(ticket.title)
    safe_description = redact_pii(ticket.description)
    safe_location    = redact_pii(ticket.location_description)

    user_prompt = (
        f'Title: {safe_title}\n'
        f'Category: {ticket.category}\n'
        f'Description: {safe_description}\n'
        f'Location: {safe_location}\n'
        f'Current assigned crew: {ticket.assigned_crew or "none"}'
    )

    # ── Call GPT-4o ───────────────────────────────────────────────────────────
    system_prompt = SYSTEM_PROMPT

    try:
        response = client.chat.completions.create(
            model='gpt-4o',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user',   'content': user_prompt},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        raw_content = response.choices[0].message.content.strip()

        # Strip markdown fences if GPT wraps output
        if raw_content.startswith('```'):
            raw_content = raw_content.split('```')[1]
            if raw_content.startswith('json'):
                raw_content = raw_content[4:]

        decision = json.loads(raw_content)

    except Exception as exc:
        logger.error('GPT-4o call failed for ticket #%s: %s', ticket_id, exc)

        AILog.objects.update_or_create(
            ticket=ticket,
            defaults={
                'status':   AILog.Status.ERROR,
                'decision': f'AI analysis failed: {exc}',
                'model':    'gpt-4o',
            },
        )
        return

    # ── Sanitise GPT output ───────────────────────────────────────────────────
    if decision.get('assigned_crew') not in CREW_INFO:
        decision['assigned_crew'] = ticket.assigned_crew or 'crew-echo'

    if decision.get('escalation_level') not in VALID_ESCALATION_LEVELS:
        decision['escalation_level'] = ''

    ai_status = (
        AILog.Status.ESCALATED
        if decision.get('escalated')
        else AILog.Status.SUCCESS
    )

    # ── Cultural sensitivity check ─────────────────────────────────────────────
    cultural_flagged, cultural_site = check_cultural_sensitivity(ticket.lat, ticket.lng)
    if cultural_flagged:
        cultural_note = f'[CULTURAL ALERT] This ticket is located within {cultural_site}, a Wahi Tapu area. Handle with cultural sensitivity and consult with iwi before any works proceed.'
        decision.setdefault('reasoning', [])
        decision['reasoning'].insert(0, cultural_note)

    # ── Update ticket ─────────────────────────────────────────────────────────
    update_fields = ['assigned_crew']
    ticket.assigned_crew = decision['assigned_crew']

    if decision.get('escalated'):
        ticket.escalated        = True
        ticket.escalation_level = decision.get('escalation_level', '')
        ticket.escalation_note  = decision.get('escalation_note', '')
        update_fields += ['escalated', 'escalation_level', 'escalation_note']

    if cultural_flagged:
        ticket.cultural_flag = True
        ticket.cultural_site = cultural_site
        update_fields += ['cultural_flag', 'cultural_site']

    ticket.save(update_fields=update_fields)

    logger.info(
        'Ticket #%s updated — crew=%s escalated=%s',
        ticket_id,
        ticket.assigned_crew,
        ticket.escalated
    )

    # ── Write AILog ───────────────────────────────────────────────────────────
    AILog.objects.update_or_create(
        ticket=ticket,
        defaults={
            'assigned_crew':    decision['assigned_crew'],
            'escalated':        decision.get('escalated', False),
            'escalation_level': decision.get('escalation_level', ''),
            'escalation_note':  decision.get('escalation_note', ''),
            'summary':          decision.get('summary', ''),
            'decision':         decision.get('decision', ''),
            'reasoning':        decision.get('reasoning', []),
            'confidence':       decision.get('confidence', 0.0),
            'status':           ai_status,
            'model':            'gpt-4o',
            'raw_response':     response.model_dump(),
        },
    )

    logger.info('AILog written for ticket #%s', ticket_id)


@receiver(post_save, sender=MaintenanceTicket)
def trigger_ai_analysis(sender, instance, created, **kwargs):
    """
    Fires on every MaintenanceTicket save.
    Only acts on creation — updates to existing tickets are ignored.
    Spawns a daemon thread so the signal returns immediately without
    blocking the citizen's HTTP response.
    """
    if not created:
        return

    logger.info(
        'New ticket #%s — spawning GPT-4o analysis thread',
        instance.pk
    )

    thread = threading.Thread(
        target=_analyse_and_save,
        args=(instance.pk,),
        daemon=True,
    )
    thread.start()