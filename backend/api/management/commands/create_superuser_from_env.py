import os
from django.core.management.base import BaseCommand
from api.models import User


class Command(BaseCommand):
    help = "Ensures a superuser exists using environment variables."

    def handle(self, *args, **kwargs):
        username = os.environ.get("SUPERUSER_USERNAME")
        email = os.environ.get("SUPERUSER_EMAIL")
        password = os.environ.get("SUPERUSER_PASSWORD")

        if not all([username, email, password]):
            self.stdout.write(self.style.WARNING(
                "SUPERUSER_USERNAME, SUPERUSER_EMAIL and SUPERUSER_PASSWORD must all be set."
            ))
            return

        user, created = User.objects.update_or_create(
            username=username,
            defaults={
                "email": email,
                "role": "superuser",
            }
        )

        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' created."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' updated."))