"""
history/serializers.py
"""

from rest_framework import serializers
from .models import LifeEvent, HistoryEvent, AuditLog


class LifeEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    member_name = serializers.CharField(source='member.display_name', read_only=True)

    class Meta:
        model = LifeEvent
        fields = (
            'id', 'member', 'member_name',
            'event_type', 'event_type_display',
            'title', 'description',
            'date', 'date_is_approximate', 'date_display', 'end_date',
            'location', 'location_lat', 'location_lng',
            'photo', 'document',
            'privacy_level',
            'added_by', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'event_type_display', 'member_name', 'added_by', 'created_at', 'updated_at')


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            'id', 'user', 'username', 'action',
            'model_name', 'object_id', 'object_repr',
            'changes', 'ip_address', 'timestamp',
        )
        read_only_fields = fields


class HistoryEventSerializer(serializers.ModelSerializer):
    """Legacy serializer."""
    class Meta:
        model = HistoryEvent
        fields = '__all__'
