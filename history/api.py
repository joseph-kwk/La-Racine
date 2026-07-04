"""
history/api.py — Life Events & Audit Log API
"""

from rest_framework import viewsets, permissions, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import LifeEvent, HistoryEvent, AuditLog
from .serializers import LifeEventSerializer, HistoryEventSerializer, AuditLogSerializer


class LifeEventViewSet(viewsets.ModelViewSet):
    """Life events / timeline entries for family members."""
    serializer_class = LifeEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'location', 'event_type']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = LifeEvent.objects.select_related('member', 'added_by')
        if user.is_staff:
            return qs
        return qs.filter(
            Q(member__tree__created_by=user) |
            Q(member__tree__permissions__user=user,
              member__tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Immutable audit trail — read-only, staff/owner only."""
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['model_name', 'action', 'user__username']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return AuditLog.objects.select_related('user').all()
        # Non-staff can see their own audit logs
        return AuditLog.objects.filter(user=user)


class HistoryEventViewSet(viewsets.ModelViewSet):
    """Legacy history events. Use LifeEventViewSet for new code."""
    queryset = HistoryEvent.objects.all()
    serializer_class = HistoryEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['event_type', 'description']
    ordering_fields = ['date']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return super().get_queryset()
        return HistoryEvent.objects.filter(
            Q(member__tree__created_by=user) |
            Q(member__tree__permissions__user=user,
              member__tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        serializer.save()
