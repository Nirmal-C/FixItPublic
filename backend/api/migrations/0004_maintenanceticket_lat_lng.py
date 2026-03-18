from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adds lat and lng float fields to MaintenanceTicket.

    These coordinates are used by ViewRequestsPage.jsx's Leaflet map view:
    each issue with lat/lng gets a colour-coded circle marker on the map.
    Both fields are nullable so existing tickets and anonymous reports
    without GPS data continue to work — the frontend already guards against
    missing values with `if (!issue.lat || !issue.lng) return`.
    """

    dependencies = [
        ('api', '0003_alter_user_groups_alter_user_is_active_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='maintenanceticket',
            name='lat',
            field=models.FloatField(
                blank=True,
                null=True,
                help_text='Latitude of the reported issue',
            ),
        ),
        migrations.AddField(
            model_name='maintenanceticket',
            name='lng',
            field=models.FloatField(
                blank=True,
                null=True,
                help_text='Longitude of the reported issue',
            ),
        ),
    ]
