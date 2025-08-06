from rest_framework import viewsets
from .models import UserProfile
from .serializers import UserProfileSerializer

from rest_framework import permissions, filters

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nickname', 'current_location', 'user__username']
    ordering_fields = ['nickname', 'birthday']
