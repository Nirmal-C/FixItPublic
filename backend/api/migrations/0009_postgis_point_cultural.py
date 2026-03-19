from django.db import migrations, models
import django.contrib.gis.db.models.fields


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_ailog'),
    ]

    operations = [
        migrations.RunSQL(
            sql='CREATE EXTENSION IF NOT EXISTS postgis;',
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AddField(
            model_name='maintenanceticket',
            name='location',
            field=django.contrib.gis.db.models.fields.PointField(
                blank=True,
                geography=True,
                help_text='PostGIS point derived from lat/lng',
                null=True,
                srid=4326,
            ),
        ),
        migrations.AddField(
            model_name='maintenanceticket',
            name='cultural_flag',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='maintenanceticket',
            name='cultural_site',
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
