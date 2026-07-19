"""
history/admin.py — Life Events, Audit Log & History Admin
==========================================================

Content management for:
- LifeEvent: rich per-member timeline events with photo/doc support
- AuditLog: immutable audit trail (read-only, no add/delete)
- HistoryEvent: legacy model (read-only reference)
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse

from .models import LifeEvent, AuditLog, HistoryEvent


EVENT_TYPE_ICONS = {
    'birth':       '🍼', 'baptism':    '⛪', 'childhood': '👦',
    'education':   '🎓', 'graduation': '🎓', 'career':    '💼',
    'military':    '🎖️',  'marriage':   '💍', 'divorce':   '📄',
    'engagement':  '💎',  'child_born': '👶', 'adoption':  '🏠',
    'moved':       '📍',  'emigrated':  '✈️',  'immigrated':'🛬',
    'award':       '🏆',  'publication':'📚', 'founded':   '🏗️',
    'illness':     '🏥',  'recovery':   '💪', 'religious': '🕌',
    'cultural':    '🎭',  'retirement': '🌅', 'death':     '⚰️',
    'memorial':    '🕯️',  'other':      '📌',
}

PRIVACY_COLOURS = {
    'public':       '#10b981',
    'family':       '#3b82f6',
    'close_family': '#f59e0b',
    'private':      '#374151',
}

ACTION_COLOURS = {
    'create':  '#10b981',
    'update':  '#3b82f6',
    'delete':  '#ef4444',
    'approve': '#6366f1',
    'reject':  '#f59e0b',
    'invite':  '#8b5cf6',
    'login':   '#9ca3af',
}


# ──────────────────────────────────────────────────────────────────────────────
# LifeEvent
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(LifeEvent)
class LifeEventAdmin(admin.ModelAdmin):
    list_display    = (
        'event_icon', 'title', 'member_link', 'date_display_col',
        'location', 'privacy_badge', 'has_media', 'created_at',
    )
    list_filter     = ('event_type', 'privacy_level', 'date_is_approximate')
    search_fields   = ('title', 'description', 'location',
                       'member__first_name', 'member__last_name')
    raw_id_fields   = ('member', 'added_by')
    readonly_fields = ('created_at', 'updated_at', 'photo_preview')
    date_hierarchy  = 'created_at'
    ordering        = ('-date', '-created_at')
    save_on_top     = True

    fieldsets = (
        ('Event', {
            'fields': ('member', 'event_type', 'title', 'description')
        }),
        ('Date', {
            'fields': ('date', 'date_is_approximate', 'date_display', 'end_date')
        }),
        ('Location', {
            'fields': ('location', 'location_lat', 'location_lng'),
            'classes': ('collapse',),
        }),
        ('Media', {
            'fields': ('photo', 'photo_preview', 'document'),
            'classes': ('collapse',),
        }),
        ('Privacy', {
            'fields': ('privacy_level',)
        }),
        ('Provenance', {
            'fields': ('added_by', 'created_at', 'updated_at'),
        }),
    )

    @admin.display(description='', ordering='event_type')
    def event_icon(self, obj):
        icon = EVENT_TYPE_ICONS.get(obj.event_type, '📌')
        return format_html(
            '<span title="{}">{}</span>',
            obj.get_event_type_display(), icon
        )

    @admin.display(description='Member')
    def member_link(self, obj):
        url = reverse('admin:tree_familymember_change', args=[obj.member.pk])
        return format_html('<a href="{}">{}</a>', url, obj.member.display_name)

    @admin.display(description='Date')
    def date_display_col(self, obj):
        if obj.date_display:
            return obj.date_display
        if obj.date:
            prefix = '~' if obj.date_is_approximate else ''
            return f'{prefix}{obj.date}'
        return '—'

    @admin.display(description='Privacy')
    def privacy_badge(self, obj):
        colour = PRIVACY_COLOURS.get(obj.privacy_level, '#9ca3af')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;'
            'border-radius:9999px;font-size:0.8em;font-weight:600">{}</span>',
            colour, obj.get_privacy_level_display()
        )

    @admin.display(description='Media', boolean=True)
    def has_media(self, obj):
        return bool(obj.photo or obj.document)

    @admin.display(description='Photo Preview')
    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-height:160px;border-radius:8px;" />',
                obj.photo.url
            )
        return '—'


# ──────────────────────────────────────────────────────────────────────────────
# AuditLog — immutable, no add/delete
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display    = (
        'timestamp', 'user', 'action_badge', 'model_name',
        'object_link', 'ip_address',
    )
    list_filter     = ('action', 'model_name')
    search_fields   = ('user__username', 'model_name', 'object_repr', 'ip_address')
    readonly_fields = (
        'user', 'action', 'model_name', 'object_id', 'object_repr',
        'changes', 'ip_address', 'user_agent', 'timestamp',
    )
    ordering        = ('-timestamp',)
    date_hierarchy  = 'timestamp'

    def has_add_permission(self, request):
        return False  # Audit logs are written by the system only

    def has_delete_permission(self, request, obj=None):
        return False  # Immutable — never delete

    def has_change_permission(self, request, obj=None):
        return False  # Read-only viewing only

    @admin.display(description='Action')
    def action_badge(self, obj):
        colour = ACTION_COLOURS.get(obj.action, '#9ca3af')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;'
            'border-radius:9999px;font-size:0.8em;font-weight:600">{}</span>',
            colour, obj.get_action_display()
        )

    @admin.display(description='Object')
    def object_link(self, obj):
        # Try to build a link to the affected object in admin
        if not obj.object_id:
            return obj.object_repr or '—'
        model_map = {
            'FamilyMember':   'tree_familymember',
            'Tree':           'tree_tree',
            'ChangeRequest':  'tree_changerequest',
            'FamilyUpdate':   'tree_familyupdate',
            'Notification':   'notifications_notification',
        }
        admin_key = model_map.get(obj.model_name)
        if admin_key:
            try:
                url = reverse(f'admin:{admin_key}_change', args=[obj.object_id])
                return format_html('<a href="{}">{}</a>', url, obj.object_repr or obj.object_id)
            except Exception:
                pass
        return obj.object_repr or str(obj.object_id)


# ──────────────────────────────────────────────────────────────────────────────
# HistoryEvent (legacy — read-only reference)
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(HistoryEvent)
class HistoryEventAdmin(admin.ModelAdmin):
    list_display    = ('event_type', 'member', 'date', 'description_preview')
    search_fields   = ('event_type', 'description', 'member__first_name')
    raw_id_fields   = ('member',)
    ordering        = ('-date',)

    @admin.display(description='Description')
    def description_preview(self, obj):
        d = obj.description
        return d[:80] + '…' if len(d) > 80 else d
