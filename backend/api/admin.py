from django.contrib import admin
from .models import MaintenanceTicket

@admin.register(MaintenanceTicket)
class MaintenanceTicketAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at')