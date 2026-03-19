from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_user_email_notifications'),
    ]

    operations = [
        migrations.CreateModel(
            name='AILog',
            fields=[
                ('id',               models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ticket',           models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='ai_log', to='api.maintenanceticket')),
                ('assigned_crew',    models.CharField(blank=True, max_length=20)),
                ('escalated',        models.BooleanField(default=False)),
                ('escalation_level', models.CharField(blank=True, max_length=20)),
                ('escalation_note',  models.TextField(blank=True)),
                ('summary',          models.TextField(blank=True, help_text='GPT-4o one-line summary of the ticket')),
                ('decision',         models.TextField(blank=True, help_text='Human-readable explanation of the AI decision')),
                ('reasoning',        models.JSONField(default=list, help_text='List of reasoning steps from GPT-4o')),
                ('confidence',       models.FloatField(default=0.0, help_text='Confidence score 0-1 from GPT-4o')),
                ('status',           models.CharField(choices=[('success', 'Success'), ('escalated', 'Escalated'), ('error', 'Error')], default='success', max_length=10)),
                ('model',            models.CharField(default='gpt-4o', max_length=50)),
                ('raw_response',     models.JSONField(blank=True, default=dict)),
                ('created_at',       models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
