"""
notifications/admin.py
"""

from django.contrib import admin
from .models import Notification, NotificationBatch


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'event_type', 'channel', 'title', 'is_read', 'status', 'created_at')
    list_filter = ('event_type', 'channel', 'is_read', 'status')
    search_fields = ('recipient__username', 'title', 'body')
    raw_id_fields = ('recipient', 'related_member', 'related_tree', 'related_change_request')
    readonly_fields = ('created_at', 'sent_at', 'read_at')
    ordering = ('-created_at',)


@admin.register(NotificationBatch)
class NotificationBatchAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'is_sent', 'created_at', 'sent_at')
    list_filter = ('is_sent',)
