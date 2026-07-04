"""
notifications/serializers.py
"""

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    related_member_name = serializers.SerializerMethodField()
    related_tree_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            'id', 'event_type', 'event_type_display', 'channel',
            'title', 'body', 'action_url',
            'related_member', 'related_member_name',
            'related_tree', 'related_tree_name',
            'related_change_request',
            'is_read', 'read_at', 'status',
            'created_at', 'sent_at',
        )
        read_only_fields = (
            'id', 'event_type_display', 'related_member_name', 'related_tree_name',
            'created_at', 'sent_at',
        )

    def get_related_member_name(self, obj):
        if obj.related_member:
            return obj.related_member.display_name
        return None

    def get_related_tree_name(self, obj):
        if obj.related_tree:
            return obj.related_tree.name
        return None
