from rest_framework import viewsets
from .models import Notification
from .serializers import NotificationSerializer

from rest_framework import permissions, filters
from core.permissions import IsOwnerOrStaff, RoleActionPermission

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, RoleActionPermission, IsOwnerOrStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['type', 'related_member__name']
    ordering_fields = ['event_date', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(target_user=user)
