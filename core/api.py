"""
core/api.py — UserProfile ViewSet
"""

from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import UserProfile
from .serializers import UserProfileSerializer


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    CRUD for user profiles. Users can only view/edit their own profile
    (unless staff).
    """
    queryset = UserProfile.objects.select_related('user', 'linked_member').all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['display_name', 'nickname', 'current_location', 'user__username', 'user__email']
    ordering_fields = ['display_name', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(user=user)

    def perform_update(self, serializer):
        # Users can only update their own profile
        if self.get_object().user != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only edit your own profile.')
        serializer.save()

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """Shortcut: /api/userprofiles/me/ — get or update current user's profile."""
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if request.method == 'PATCH':
            serializer = self.get_serializer(
                profile, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='claim-member')
    def claim_member(self, request):
        """
        Link the current user's profile to a FamilyMember record.
        POST /api/userprofiles/claim-member/ with {"member_id": 42}
        """
        from tree.models import FamilyMember
        member_id = request.data.get('member_id')
        if not member_id:
            return Response({'error': 'member_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = FamilyMember.objects.get(pk=member_id)
        except FamilyMember.DoesNotExist:
            return Response({'error': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check the member isn't already claimed by someone else
        if member.user_account and member.user_account != request.user:
            return Response(
                {'error': 'This family member profile is already linked to another account.'},
                status=status.HTTP_409_CONFLICT
            )

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.linked_member = member
        profile.save(update_fields=['linked_member'])

        # Also set the reverse link on FamilyMember
        member.user_account = request.user
        member.save(update_fields=['user_account'])

        return Response(
            self.get_serializer(profile).data,
            status=status.HTTP_200_OK
        )
