from rest_framework import viewsets
from .models import HistoryEvent
from .serializers import HistoryEventSerializer

from rest_framework import permissions, filters

class HistoryEventViewSet(viewsets.ModelViewSet):
    queryset = HistoryEvent.objects.all()
    serializer_class = HistoryEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['event_type', 'member__name']
    ordering_fields = ['date']
