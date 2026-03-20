from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_cultural_flag'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar',
            field=models.ImageField(blank=True, null=True, upload_to='avatars/'),
        ),
    ]
