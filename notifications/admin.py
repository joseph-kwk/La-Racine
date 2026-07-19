"""
notifications/admin.py — Notification Management Admin
=======================================================

Full notification content management:
- Per-channel breakdown (in-app, email, push)
- Delivery status badges
- Bulk send / resend / mark-read actions
- Linked objects (member, tree, change request)
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.contrib import messages

from .models import Notification, NotificationBatch

STATUS_COLOURS = {
    'pending':   '#f59e0b',
    'sent':      '#3b82f6',
    'delivered': '#10b981',
    'failed':    '#ef4444',
}

CHANNEL_ICONS = {
    'in_app': '🔔',
    'email':  '📧',
    'push':   '📱',
}


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'recipient', 'channel_icon', 'event_type', 'title_preview',
        'status_badge', 'is_read', 'created_at',
    )
    list_filter   = ('event_type', 'channel', 'is_read', 'status')
    search_fields = ('recipient__username', 'recipient__email', 'title', 'body')
    raw_id_fields = ('recipient', 'related_member', 'related_tree', 'related_change_request')
    readonly_fields = ('created_at', 'sent_at', 'read_at', 'related_links')
    date_hierarchy  = 'created_at'
    ordering        = ('-created_at',)
    actions         = ['action_mark_read', 'action_mark_unread', 'action_mark_sent']

    fieldsets = (
        ('Recipient & Channel', {
            'fields': ('recipient', 'channel', 'event_type')
        }),
        ('Content', {
            'fields': ('title', 'body', 'action_url')
        }),
        ('Related Objects', {
            'fields': ('related_member', 'related_tree', 'related_change_request', 'related_links'),
            'classes': ('collapse',),
        }),
        ('State & Delivery', {
            'fields': ('is_read', 'read_at', 'status', 'sent_at', 'error_message', 'created_at'),
        }),
    )

    @admin.display(description='Channel')
    def channel_icon(self, obj):
        icon = CHANNEL_ICONS.get(obj.channel, '🔔')
        return format_html('{} {}', icon, obj.channel)

    @admin.display(description='Title')
    def title_preview(self, obj):
        t = obj.title or obj.body[:60]
        return t[:72] + '…' if len(t) > 72 else t

    @admin.display(description='Status')
    def status_badge(self, obj):
        colour = STATUS_COLOURS.get(obj.status, '#9ca3af')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:9999px;font-size:0.8em;font-weight:600">{}</span>',
            colour, obj.status.title()
        )

    @admin.display(description='Related Objects')
    def related_links(self, obj):
        parts = []
        if obj.related_member:
            url = reverse('admin:tree_familymember_change', args=[obj.related_member.pk])
            parts.append(format_html('👤 <a href="{}">Member: {}</a>', url, obj.related_member.display_name))
        if obj.related_tree:
            url = reverse('admin:tree_tree_change', args=[obj.related_tree.pk])
            parts.append(format_html('🌳 <a href="{}">Tree: {}</a>', url, obj.related_tree.name))
        if obj.related_change_request:
            url = reverse('admin:tree_changerequest_change', args=[obj.related_change_request.pk])
            parts.append(format_html('📝 <a href="{}">Change Request #{}</a>', url, obj.related_change_request.pk))
        return format_html('<br>'.join(str(p) for p in parts)) if parts else '—'

    @admin.action(description='✅ Mark selected as read')
    def action_mark_read(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(is_read=False).update(is_read=True, read_at=timezone.now())
        self.message_user(request, f'{updated} notification(s) marked as read.', messages.SUCCESS)

    @admin.action(description='🔄 Mark selected as unread')
    def action_mark_unread(self, request, queryset):
        updated = queryset.update(is_read=False, read_at=None)
        self.message_user(request, f'{updated} notification(s) marked as unread.', messages.SUCCESS)

    @admin.action(description='📤 Mark selected as Sent')
    def action_mark_sent(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status='pending').update(status='sent', sent_at=timezone.now())
        self.message_user(request, f'{updated} notification(s) marked as sent.', messages.SUCCESS)


@admin.register(NotificationBatch)
class NotificationBatchAdmin(admin.ModelAdmin):
    list_display    = ('recipient', 'notification_count', 'is_sent', 'created_at', 'sent_at')
    list_filter     = ('is_sent',)
    search_fields   = ('recipient__username', 'recipient__email')
    raw_id_fields   = ('recipient',)
    readonly_fields = ('created_at', 'sent_at')
    date_hierarchy  = 'created_at'
    filter_horizontal = ('notifications',)
    actions         = ['action_mark_sent']

    def get_queryset(self, request):
        from django.db.models import Count
        return super().get_queryset(request).annotate(_n_count=Count('notifications'))

    @admin.display(description='Notifications', ordering='_n_count')
    def notification_count(self, obj):
        return obj._n_count

    @admin.action(description='📤 Mark selected batches as Sent')
    def action_mark_sent(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(is_sent=False).update(is_sent=True, sent_at=timezone.now())
        self.message_user(request, f'{updated} batch(es) marked as sent.', messages.SUCCESS)
