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

    title                = models.CharField(max_length=200)
    description          = models.TextField()
    category             = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    status               = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    location_description = models.CharField(max_length=300, blank=True)
    photo                = models.ImageField(upload_to='tickets/%Y/%m/', blank=True, null=True)
    reporter_name        = models.CharField(max_length=100, blank=True)
    reporter_email       = models.EmailField(blank=True)
    reporter_user        = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='tickets',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'#{self.pk} {self.title}'