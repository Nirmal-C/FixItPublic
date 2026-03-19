from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point


class User(AbstractUser):

    class Role(models.TextChoices):
        CITIZEN   = 'citizen',   'Citizen'
        ADMIN     = 'admin',     'Admin'
        SUPERUSER = 'superuser', 'Superuser'

    role                = models.CharField(max_length=10, choices=Role.choices, default=Role.CITIZEN)
    phone               = models.CharField(max_length=20, blank=True)
    email               = models.EmailField(unique=True)
    email_notifications = models.BooleanField(
        default=False,
        help_text='Send transactional emails for account events and ticket updates.',
    )

    @property
    def is_council_admin(self):
        return self.role in (self.Role.ADMIN, self.Role.SUPERUSER)

    @property
    def is_superuser_role(self):
        return self.role == self.Role.SUPERUSER

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'


# Maps each issue category to the crew best suited to handle it.
# Used during ticket creation to auto-assign before a human reviews.
CATEGORY_CREW_MAP = {
    'streetlight':   'crew-bravo',
    'road':          'crew-alpha',
    'footpath':      'crew-alpha',
    'park':          'crew-charlie',
    'graffiti':      'crew-delta',
    'bus_stop':      'crew-echo',
    'public_toilet': 'crew-echo',
    'other':         'crew-echo',
}


class MaintenanceTicket(models.Model):

    class Status(models.TextChoices):
        PENDING     = 'pending',     'Pending'
        IN_PROGRESS = 'in_progress', 'In Progress'
        RESOLVED    = 'resolved',    'Resolved'
        CLOSED      = 'closed',      'Closed'

    class Category(models.TextChoices):
        STREETLIGHT   = 'streetlight',   'Streetlight'
        PARK          = 'park',          'Park / Green Space'
        FOOTPATH      = 'footpath',      'Footpath'
        ROAD          = 'road',          'Road / Pothole'
        PUBLIC_TOILET = 'public_toilet', 'Public Toilet'
        BUS_STOP      = 'bus_stop',      'Bus Stop / Shelter'
        GRAFFITI      = 'graffiti',      'Graffiti'
        OTHER         = 'other',         'Other'

    class Crew(models.TextChoices):
        ALPHA   = 'crew-alpha',   'Team Alpha — Roads & Footpaths'
        BRAVO   = 'crew-bravo',   'Team Bravo — Streetlights & Electrical'
        CHARLIE = 'crew-charlie', 'Team Charlie — Parks & Green Spaces'
        DELTA   = 'crew-delta',   'Team Delta — Graffiti Removal'
        ECHO    = 'crew-echo',    'Team Echo — General Maintenance'

    class EscalationLevel(models.TextChoices):
        SENIOR_ENGINEER  = 'senior_engineer',  'Senior Engineer'
        COUNCIL_MANAGER  = 'council_manager',  'Council Manager'
        EMERGENCY        = 'emergency',        'Emergency Services'

    title                = models.CharField(max_length=200)
    description          = models.TextField()
    category             = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    status               = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    location_description = models.CharField(max_length=300, blank=True)
    photo                = models.ImageField(upload_to='tickets/%Y/%m/', blank=True, null=True)
    photo2               = models.ImageField(upload_to='tickets/%Y/%m/', blank=True, null=True)
    photo3               = models.ImageField(upload_to='tickets/%Y/%m/', blank=True, null=True)
    photo4               = models.ImageField(upload_to='tickets/%Y/%m/', blank=True, null=True)
    photo5               = models.ImageField(upload_to='tickets/%Y/%m/', blank=True, null=True)
    reporter_name        = models.CharField(max_length=100, blank=True)
    reporter_email       = models.EmailField(blank=True)
    reporter_user        = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='tickets',
    )
    lat        = models.FloatField(null=True, blank=True, help_text='Latitude of the reported issue')
    lng        = models.FloatField(null=True, blank=True, help_text='Longitude of the reported issue')
    location   = gis_models.PointField(geography=True, null=True, blank=True, srid=4326,
                                       help_text='PostGIS point derived from lat/lng')

    # Cultural sensitivity flag — set by Cultural Guardian
    cultural_flag = models.BooleanField(default=False)
    cultural_site = models.CharField(max_length=200, blank=True)

    # Crew assignment — auto-set on creation, editable by admin
    assigned_crew = models.CharField(
        max_length=20, choices=Crew.choices, blank=True, default='',
        help_text='Maintenance crew assigned to this ticket',
    )

    # Escalation — set by admin when the issue needs specialist or senior review
    escalated         = models.BooleanField(default=False)
    escalation_level  = models.CharField(
        max_length=20, choices=EscalationLevel.choices, blank=True, default='',
    )
    escalation_note   = models.TextField(blank=True, default='')
    escalated_at      = models.DateTimeField(null=True, blank=True)
    escalated_by      = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='escalated_tickets',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.lat is not None and self.lng is not None:
            self.location = Point(self.lng, self.lat, srid=4326)
        super().save(*args, **kwargs)

    @classmethod
    def find_nearby_duplicate(cls, category, lat, lng, radius_m=50):
        from django.contrib.gis.measure import D
        if lat is None or lng is None:
            return None
        pt = Point(lng, lat, srid=4326)
        return cls.objects.filter(
            location__distance_lte=(pt, D(m=radius_m)),
            category=category,
            status__in=['pending', 'in_progress'],
        ).exclude(location=None).first()

    def __str__(self):
        return f'#{self.pk} {self.title}'

class AILog(models.Model):
    """
    Stores the real GPT-4o decision made for each ticket on creation.
    Written by signals.py after analysing the ticket — replaces the mock
    data that was previously generated client-side in AILogPage.jsx.
    """

    class Status(models.TextChoices):
        SUCCESS   = 'success',   'Success'
        ESCALATED = 'escalated', 'Escalated'
        ERROR     = 'error',     'Error'

    # The ticket this log entry belongs to (one-to-one)
    ticket = models.OneToOneField(
        MaintenanceTicket,
        on_delete=models.CASCADE,
        related_name='ai_log',
    )

    # GPT-4o decisions
    assigned_crew    = models.CharField(max_length=20, blank=True)
    escalated        = models.BooleanField(default=False)
    escalation_level = models.CharField(max_length=20, blank=True)
    escalation_note  = models.TextField(blank=True)
    summary          = models.TextField(blank=True, help_text='GPT-4o one-line summary of the ticket')
    decision         = models.TextField(blank=True, help_text='Human-readable explanation of the AI decision')
    reasoning        = models.JSONField(default=list,  help_text='List of reasoning steps from GPT-4o')
    confidence       = models.FloatField(default=0.0,  help_text='Confidence score 0-1 from GPT-4o')
    status           = models.CharField(max_length=10, choices=Status.choices, default=Status.SUCCESS)
    model            = models.CharField(max_length=50, default='gpt-4o')

    # Raw OpenAI response stored for debugging
    raw_response = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'AILog for ticket #{self.ticket_id} — {self.status}'
