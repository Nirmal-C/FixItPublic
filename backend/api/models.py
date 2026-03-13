from django.db import models

class MaintenanceTicket(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    # The 'upload_to' creates a sub-folder inside Azure Container
    photo = models.ImageField(upload_to='tickets/%Y/%m/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title