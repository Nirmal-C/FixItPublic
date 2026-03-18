from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    class Role(models.TextChoices):
        CITIZEN   = 'citizen',   'Citizen'
        ADMIN     = 'admin',     'Admin'
        SUPERUSER = 'superuser', 'Superuser'

    role  = models.CharField(max_length=10, choices=Role.choices, default=Role.CITIZEN)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(unique=True)

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

    def __str__(self):
        return f'#{self.pk} {self.title}'