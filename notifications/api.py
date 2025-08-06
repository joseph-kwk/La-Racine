from rest_framework import viewsets
from .models import Notification
from .serializers import NotificationSerializer

from rest_framework import permissions, filters

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['type', 'related_member__name']
    ordering_fields = ['event_date', 'created_at']
