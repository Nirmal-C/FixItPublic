from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adds photo2–photo5 ImageFields to MaintenanceTicket so reporters
    can attach up to 5 images per ticket.

    All fields are nullable/blank — existing tickets with only one
    photo (or no photo) continue to work without any data changes.
    The Django photo proxy view (serve_photo) is updated to look up
    paths across all five fields.
    """

    dependencies = [
        ('api', '0005_maintenanceticket_crew_escalation'),
    ]

    operations = [
        migrations.AddField(
            model_name='maintenanceticket',
            name='photo2',
            field=models.ImageField(blank=True, null=True, upload_to='tickets/%Y/%m/'),
        ),
        migrations.AddField(
            model_name='maintenanceticket',
            name='photo3',
            field=models.ImageField(blank=True, null=True, upload_to='tickets/%Y/%m/'),
        ),
        migrations.AddField(
            model_name='maintenanceticket',
            name='photo4',
            field=models.ImageField(blank=True, null=True, upload_to='tickets/%Y/%m/'),
        ),
        migrations.AddField(
            model_name='maintenanceticket',
            name='photo5',
            field=models.ImageField(blank=True, null=True, upload_to='tickets/%Y/%m/'),
        ),
    ]
