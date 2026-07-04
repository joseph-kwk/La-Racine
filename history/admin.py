"""
history/admin.py
"""

from django.contrib import admin
from .models import LifeEvent, AuditLog, HistoryEvent


@admin.register(LifeEvent)
class LifeEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_type', 'member', 'date', 'location', 'privacy_level')
    list_filter = ('event_type', 'privacy_level', 'date_is_approximate')
    search_fields = ('title', 'description', 'member__first_name', 'member__last_name')
    raw_id_fields = ('member', 'added_by')
    ordering = ('-date',)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'model_name', 'object_id', 'timestamp')
    list_filter = ('action', 'model_name')
    search_fields = ('user__username', 'model_name', 'object_repr')
    readonly_fields = ('user', 'action', 'model_name', 'object_id', 'object_repr', 'changes', 'ip_address', 'timestamp')
    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False  # Audit logs are immutable

    def has_delete_permission(self, request, obj=None):
        return False  # Audit logs are immutable


@admin.register(HistoryEvent)
class HistoryEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'member', 'date')
