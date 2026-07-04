"""
notifications/api.py — Notification ViewSet
"""

from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Notifications for the authenticated user.
    Supports bulk mark-as-read and unread count.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at']
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']  # no POST (system creates)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Notification.objects.all().select_related('recipient', 'related_member', 'related_tree')
        qs = Notification.objects.filter(
            recipient=user, channel='in_app'
        ).select_related('related_member', 'related_tree')

        # Optional filter: unread only
        if self.request.query_params.get('unread') == 'true':
            qs = qs.filter(is_read=False)

        return qs

    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        """Mark a single notification as read."""
        notif = self.get_object()
        notif.mark_read()
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Mark all in-app notifications as read for the current user."""
        updated = Notification.objects.filter(
            recipient=request.user, channel='in_app', is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({'marked_read': updated})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Return the count of unread in-app notifications."""
        count = Notification.objects.filter(
            recipient=request.user, channel='in_app', is_read=False
        ).count()
        return Response({'unread_count': count})
