from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import Tree, FamilyMember, Update
from .serializers import TreeSerializer, FamilyMemberSerializer, UpdateSerializer
from core.permissions import IsOwnerOrStaff, RoleActionPermission


class TreeViewSet(viewsets.ModelViewSet):
    queryset = Tree.objects.all()
    serializer_class = TreeSerializer
    permission_classes = [permissions.IsAuthenticated, RoleActionPermission, IsOwnerOrStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'created_by__username']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(created_by=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if not user.is_staff and instance.created_by != user:
            raise PermissionDenied('You do not own this tree.')
        # Prevent changing ownership
        serializer.save(created_by=instance.created_by)

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_staff and instance.created_by != user:
            raise PermissionDenied('You do not own this tree.')
        instance.delete()

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members for a specific tree"""
        tree = self.get_object()
        members = FamilyMember.objects.filter(tree=tree)
        serializer = FamilyMemberSerializer(members, many=True)
        return Response(serializer.data)


class FamilyMemberViewSet(viewsets.ModelViewSet):
    queryset = FamilyMember.objects.all()
    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.IsAuthenticated, RoleActionPermission, IsOwnerOrStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'nickname', 'location']
    ordering_fields = ['name', 'dob']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(tree__created_by=user)

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if not user.is_staff:
            tree = serializer.validated_data.get('tree', instance.tree)
            if tree.created_by != user:
                raise PermissionDenied('You do not own the selected tree.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_staff and instance.tree.created_by != user:
            raise PermissionDenied('You do not own the selected tree.')
        instance.delete()


class UpdateViewSet(viewsets.ModelViewSet):
    queryset = Update.objects.all()
    serializer_class = UpdateSerializer
    permission_classes = [permissions.IsAuthenticated, RoleActionPermission, IsOwnerOrStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['content', 'member__name']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(member__tree__created_by=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if not user.is_staff:
            member = serializer.validated_data.get('member', instance.member)
            if member.tree.created_by != user:
                raise PermissionDenied('You do not own the selected member/tree.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_staff and instance.member.tree.created_by != user:
            raise PermissionDenied('You do not own the selected member/tree.')
        instance.delete()
