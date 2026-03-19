from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        # Register post_save signal that triggers GPT-4o analysis on ticket creation
        import api.signals  # noqa: F401
