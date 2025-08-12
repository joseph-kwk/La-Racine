from rest_framework import viewsets
from .models import UserProfile
from .serializers import UserProfileSerializer

from rest_framework import permissions, filters
from core.permissions import IsOwnerOrStaff, RoleActionPermission

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, RoleActionPermission, IsOwnerOrStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nickname', 'current_location', 'user__username']
    ordering_fields = ['nickname', 'birthday']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(user=user)
