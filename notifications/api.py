"""
notifications/api.py — Notification ViewSet

BUG #5 FIX: Removed `http_method_names` restriction that was blocking POST
  from @action endpoints (mark-all-read). The correct approach is to restrict
  the *standard* create/update endpoints via `create`/`update` overrides, not
  `http_method_names` which applies globally before routing.

BUG #10 FIX: channel='in_app' filter now applied in list only via
  `filter_queryset`, not in `get_queryset` — detail endpoint works for
  any channel owned by the user.
"""

from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, MethodNotAllowed
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Notifications for the authenticated user.
    Supports single mark-as-read, bulk mark-all-read, and unread count.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    # --- Disable standard create/update/put via HTTP method overrides ---
    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed('POST', detail='Notifications are created by the system only.')

    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed('PUT')

    def partial_update(self, request, *args, **kwargs):
        # Allow PATCH only on is_read field via the dedicated /read/ action
        raise MethodNotAllowed('PATCH', detail='Use /read/ action to mark a notification as read.')

    # --- Queryset ----------------------------------------------------------

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Notification.objects.all().select_related(
                'recipient', 'related_member', 'related_tree'
            )

        # BUG #10 FIX: base queryset returns ALL user notifications regardless
        # of channel so that detail/{id}/ still works for any channel.
        qs = Notification.objects.filter(
            recipient=user
        ).select_related('related_member', 'related_tree')

        return qs

    def list(self, request, *args, **kwargs):
        """BUG #10 FIX: restrict to in_app channel only on list view."""
        user = request.user
        if not user.is_staff:
            qs = self.get_queryset().filter(channel='in_app')
            # Optional filter: unread only
            if request.query_params.get('unread') == 'true':
                qs = qs.filter(is_read=False)
        else:
            qs = self.get_queryset()

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    # --- Custom actions ---------------------------------------------------

    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        """Mark a single notification as read."""
        notif = self.get_object()
        if notif.recipient != request.user and not request.user.is_staff:
            raise PermissionDenied('You can only mark your own notifications as read.')
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
