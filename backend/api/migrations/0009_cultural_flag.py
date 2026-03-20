from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_ailog'),
    ]

    operations = [
        migrations.AddField(
            model_name='maintenanceticket',
            name='cultural_flag',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='maintenanceticket',
            name='cultural_site',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
    ]
