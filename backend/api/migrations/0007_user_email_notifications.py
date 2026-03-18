from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_maintenanceticket_extra_photos'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_notifications',
            field=models.BooleanField(
                default=False,
                help_text='Send transactional emails for account events and ticket updates.',
            ),
        ),
    ]
