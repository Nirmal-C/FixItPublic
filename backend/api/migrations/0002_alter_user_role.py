from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('citizen',   'Citizen'),
                    ('admin',     'Admin'),
                    ('superuser', 'Superuser'),
                ],
                default='citizen',
                max_length=10,
            ),
        ),
    ]