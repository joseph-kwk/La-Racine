from rest_framework import viewsets
from .models import HistoryEvent
from .serializers import HistoryEventSerializer

from rest_framework import permissions, filters
from core.permissions import IsOwnerOrStaff, RoleActionPermission

class HistoryEventViewSet(viewsets.ModelViewSet):
    queryset = HistoryEvent.objects.all()
    serializer_class = HistoryEventSerializer
    permission_classes = [permissions.IsAuthenticated, RoleActionPermission, IsOwnerOrStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['event_type', 'member__name']
    ordering_fields = ['date']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(member__tree__created_by=user)
