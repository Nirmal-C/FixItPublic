from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, MaintenanceTicket


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ('username', 'email', 'role', 'is_active', 'email_notifications', 'date_joined')
    list_filter   = ('role', 'is_active', 'email_notifications')
    search_fields = ('username', 'email')
    ordering      = ('-date_joined',)
    fieldsets     = BaseUserAdmin.fieldsets + (
        ('FixIt Profile', {'fields': ('role', 'phone', 'email_notifications')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('FixIt Profile', {'fields': ('email', 'role', 'phone', 'email_notifications')}),
    )


@admin.register(MaintenanceTicket)
class MaintenanceTicketAdmin(admin.ModelAdmin):
    list_display   = (
        'id', 'title', 'category', 'status', 'assigned_crew',
        'escalated', 'reporter_display', 'created_at',
    )
    list_filter    = ('status', 'category', 'assigned_crew', 'escalated')
    search_fields  = ('title', 'description', 'location_description', 'reporter_name', 'reporter_email')
    ordering       = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'escalated_at', 'escalated_by', 'reporter_user')
    fieldsets = (
        ('Report', {
            'fields': ('title', 'description', 'category', 'status', 'location_description', 'lat', 'lng'),
        }),
        ('Photos', {
            'fields': ('photo', 'photo2', 'photo3', 'photo4', 'photo5'),
            'classes': ('collapse',),
        }),
        ('Reporter', {
            'fields': ('reporter_user', 'reporter_name', 'reporter_email'),
        }),
        ('Assignment', {
            'fields': ('assigned_crew',),
        }),
        ('Escalation', {
            'fields': ('escalated', 'escalation_level', 'escalation_note', 'escalated_at', 'escalated_by'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def reporter_display(self, obj):
        if obj.reporter_user:
            return obj.reporter_user.username
        return obj.reporter_name or '(anonymous)'
    reporter_display.short_description = 'Reporter'
