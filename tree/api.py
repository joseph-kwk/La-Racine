from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Tree, FamilyMember, Update
from .serializers import TreeSerializer, FamilyMemberSerializer, UpdateSerializer


class TreeViewSet(viewsets.ModelViewSet):
    queryset = Tree.objects.all()
    serializer_class = TreeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'created_by__username']
    ordering_fields = ['name', 'created_at']

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
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'nickname', 'location']
    ordering_fields = ['name', 'dob']


class UpdateViewSet(viewsets.ModelViewSet):
    queryset = Update.objects.all()
    serializer_class = UpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['content', 'member__name']
    ordering_fields = ['timestamp']
