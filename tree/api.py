from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from django.db.models import Count, Q
from .models import Tree, FamilyMember, Update, TreePermission
from .serializers import TreeSerializer, FamilyMemberSerializer, UpdateSerializer
from core.permissions import IsOwnerOrStaff, RoleActionPermission


class TreeViewSet(viewsets.ModelViewSet):
    queryset = Tree.objects.all()
    serializer_class = TreeSerializer
    # Remove IsOwnerOrStaff as we handle granular permissions in methods/queryset
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'created_by__username']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Tree.objects.annotate(
            member_count=Count('members', distinct=True),
            relationship_count=Count('members__spouses', distinct=True) # Approximate relationship count
        )
        
        if user.is_staff:
            return qs
            
        # Return trees created by user OR trees where user has permission
        return qs.filter(
            Q(created_by=user) | 
            Q(permissions__user=user, permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        tree = serializer.save(created_by=self.request.user)
        # Auto-assign owner permission
        TreePermission.objects.create(
            tree=tree,
            user=self.request.user,
            role='owner',
            status='active'
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if not user.is_staff:
            # Check for owner or editor permission
            has_perm = TreePermission.objects.filter(
                tree=instance,
                user=user,
                role__in=['owner', 'editor'],
                status='active'
            ).exists()
            if not has_perm:
                raise PermissionDenied('You do not have permission to edit this tree.')
                
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_staff:
            # Only owner can delete
            has_perm = TreePermission.objects.filter(
                tree=instance,
                user=user,
                role='owner',
                status='active'
            ).exists()
            if not has_perm:
                raise PermissionDenied('You must be the owner to delete this tree.')
        instance.delete()

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members for a specific tree"""
        tree = self.get_object() # get_object enforces get_queryset visibility
        members = FamilyMember.objects.filter(tree=tree)
        serializer = FamilyMemberSerializer(members, many=True)
        return Response(serializer.data)


class FamilyMemberViewSet(viewsets.ModelViewSet):
    queryset = FamilyMember.objects.all()
    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'location']
    ordering_fields = ['first_name', 'birth_date']

    def get_queryset(self):
        user = self.request.user
        qs = FamilyMember.objects.all()
        if user.is_staff:
            return qs
        
        # User can see members of trees they have access to
        # (permissions logic same as TreeViewSet)
        return qs.filter(
            Q(tree__created_by=user) |
            Q(tree__permissions__user=user, tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        tree = serializer.validated_data.get('tree')
        user = self.request.user
        if not user.is_staff:
             # Check edit permission on the target tree
             has_perm = TreePermission.objects.filter(
                tree=tree, 
                user=user, 
                role__in=['owner', 'editor'],
                status='active'
            ).exists()
             if not has_perm:
                 raise PermissionDenied('You do not have permission to add members to this tree.')
                 
        serializer.save(added_by=user)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        # Serializer validation handles tree permission checks for the update itself,
        # but we also check if the user can edit THIS instance
        if not user.is_staff:
             has_perm = TreePermission.objects.filter(
                tree=instance.tree, 
                user=user, 
                role__in=['owner', 'editor'],
                status='active'
            ).exists()
             if not has_perm:
                 raise PermissionDenied('You do not have permission to edit this member.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_staff:
             has_perm = TreePermission.objects.filter(
                tree=instance.tree, 
                user=user, 
                role__in=['owner', 'editor'],
                status='active'
            ).exists()
             if not has_perm:
                 raise PermissionDenied('You do not have permission to delete this member.')
        instance.delete()


class UpdateViewSet(viewsets.ModelViewSet):
    queryset = Update.objects.all()
    serializer_class = UpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['content', 'member__first_name', 'member__last_name']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        
        return qs.filter(
            Q(member__tree__created_by=user) |
            Q(member__tree__permissions__user=user, member__tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        member = serializer.validated_data.get('member')
        user = self.request.user
        if not user.is_staff:
             has_perm = TreePermission.objects.filter(
                tree=member.tree, 
                user=user, 
                role__in=['owner', 'editor'],
                status='active'
            ).exists()
             if not has_perm:
                 raise PermissionDenied('You do not have permission to post updates here.')
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if not user.is_staff:
             # Only author or staff/owner can edit? Or just editors?
             # For now, stick to tree editors
             has_perm = TreePermission.objects.filter(
                tree=instance.member.tree, 
                user=user, 
                role__in=['owner', 'editor'],
                status='active'
            ).exists()
             if not has_perm:
                 raise PermissionDenied('You do not have permission to edit this update.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_staff:
             has_perm = TreePermission.objects.filter(
                tree=instance.member.tree, 
                user=user, 
                role__in=['owner', 'editor'],
                status='active'
            ).exists()
             if not has_perm:
                 raise PermissionDenied('You do not have permission to delete this update.')
        instance.delete()
