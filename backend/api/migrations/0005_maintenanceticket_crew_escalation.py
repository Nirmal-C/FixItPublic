from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Adds crew assignment and escalation fields to MaintenanceTicket.

    - assigned_crew: which maintenance crew is handling the ticket
      (auto-set on creation via CATEGORY_CREW_MAP, editable by admin)
    - escalated / escalation_level / escalation_note: escalation workflow
    - escalated_at / escalated_by: audit trail — who escalated and when
    """

    dependencies = [
        ('api', '0004_maintenanceticket_lat_lng'),
    ]

    operations = [
        # Crew assignment
        migrations.AddField(
            model_name='maintenanceticket',
            name='assigned_crew',
            field=models.CharField(
                blank=True,
                choices=[
                    ('crew-alpha',   'Team Alpha — Roads & Footpaths'),
                    ('crew-bravo',   'Team Bravo — Streetlights & Electrical'),
                    ('crew-charlie', 'Team Charlie — Parks & Green Spaces'),
                    ('crew-delta',   'Team Delta — Graffiti Removal'),
                    ('crew-echo',    'Team Echo — General Maintenance'),
                ],
                default='',
                help_text='Maintenance crew assigned to this ticket',
                max_length=20,
            ),
        ),

        # Escalation flag
        migrations.AddField(
            model_name='maintenanceticket',
            name='escalated',
            field=models.BooleanField(default=False),
        ),

        # Escalation level (senior engineer / council manager / emergency)
        migrations.AddField(
            model_name='maintenanceticket',
            name='escalation_level',
            field=models.CharField(
                blank=True,
                choices=[
                    ('senior_engineer', 'Senior Engineer'),
                    ('council_manager', 'Council Manager'),
                    ('emergency',       'Emergency Services'),
                ],
                default='',
                max_length=20,
            ),
        ),

        # Free-text note explaining why the ticket was escalated
        migrations.AddField(
            model_name='maintenanceticket',
            name='escalation_note',
            field=models.TextField(blank=True, default=''),
        ),

        # Timestamp of when the ticket was escalated
        migrations.AddField(
            model_name='maintenanceticket',
            name='escalated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),

        # FK to the admin user who triggered the escalation
        migrations.AddField(
            model_name='maintenanceticket',
            name='escalated_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='escalated_tickets',
                to='api.user',
            ),
        ),
    ]
