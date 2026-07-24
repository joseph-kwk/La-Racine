"""
tree/api.py — ViewSets for all tree-related models

Includes:
- TreeViewSet (with members, permissions, invitations actions)
- FamilyMemberViewSet (with relationships, change_requests, validators actions)
- FamilyRelationshipViewSet
- ChangeRequestViewSet (with approve/reject actions)
- ChangeRequestValidatorViewSet
- FamilyPhotoViewSet
- FamilyUpdateViewSet (with comment/like actions)
- TreeInvitationViewSet
- UpdateViewSet (legacy)
"""

from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from django.db.models import Count, Q

from .models import (
    Tree, TreePermission, FamilyMember, FamilyRelationship,
    MemberPrivacySettings, ChangeRequest, ChangeRequestValidator,
    FamilyPhoto, PhotoTag, FamilyUpdate, UpdateComment, UpdateLike,
    TreeInvitation, Update, FuzzyDate, FamilyEvent, CalendarFeedToken,
)
from .serializers import (
    TreeSerializer, TreePermissionSerializer,
    FamilyMemberSerializer, FamilyMemberLightSerializer, FamilyRelationshipSerializer,
    MemberPrivacySettingsSerializer,
    ChangeRequestSerializer, ChangeRequestValidatorSerializer,
    FamilyPhotoSerializer, PhotoTagSerializer,
    FamilyUpdateSerializer, UpdateCommentSerializer, UpdateLikeSerializer,
    TreeInvitationSerializer, UpdateSerializer, FuzzyDateSerializer,
    FamilyEventSerializer, CalendarFeedTokenSerializer,
)
from .calendar_utils import build_ics_feed
from .kinship_utils import resolve_user_member, compute_kinship_map
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_tree_role(user, tree):
    """Return the user's active role on a tree, or None."""
    if user.is_staff:
        return 'owner'
    try:
        perm = TreePermission.objects.get(tree=tree, user=user, status='active')
        return perm.role
    except TreePermission.DoesNotExist:
        return None


def assert_tree_role(user, tree, allowed_roles, msg=None):
    """Raise PermissionDenied if user doesn't have one of the allowed roles."""
    role = get_tree_role(user, tree)
    if role not in allowed_roles:
        raise PermissionDenied(
            msg or f'Requires one of: {", ".join(allowed_roles)}'
        )
    return role


def accessible_trees_query(user):
    """Q filter: trees the user can see."""
    return (
        Q(created_by=user) |
        Q(permissions__user=user, permissions__status='active')
    )


# ---------------------------------------------------------------------------
# FuzzyDate ViewSet
# ---------------------------------------------------------------------------

class FuzzyDateViewSet(viewsets.ModelViewSet):
    queryset = FuzzyDate.objects.all()
    serializer_class = FuzzyDateSerializer
    permission_classes = [permissions.IsAuthenticated]


# ---------------------------------------------------------------------------
# Tree ViewSet
# ---------------------------------------------------------------------------

class TreeViewSet(viewsets.ModelViewSet):
    serializer_class = TreeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'created_by__username']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Tree.objects.annotate(
            member_count=Count('members', distinct=True),
            relationship_count=Count('members__relationships_from', distinct=True),
        )
        if user.is_staff:
            return qs
        return qs.filter(accessible_trees_query(user)).distinct()

    def perform_create(self, serializer):
        tree = serializer.save(created_by=self.request.user)
        TreePermission.objects.create(
            tree=tree,
            user=self.request.user,
            role='owner',
            status='active',
        )

    def perform_update(self, serializer):
        assert_tree_role(self.request.user, self.get_object(), ['owner', 'editor'])
        serializer.save()

    def perform_destroy(self, instance):
        assert_tree_role(
            self.request.user, instance, ['owner'],
            'Only the owner can delete this tree.'
        )
        instance.delete()

    # --- Custom actions ---

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """List all members in a tree."""
        tree = self.get_object()
        members = FamilyMember.objects.filter(tree=tree).select_related('birth_date', 'death_date')
        serializer = FamilyMemberSerializer(members, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """List all permissions (collaborators) for a tree."""
        tree = self.get_object()
        assert_tree_role(request.user, tree, ['owner', 'validator', 'editor'])
        perms = TreePermission.objects.filter(tree=tree).select_related('user')
        return Response(TreePermissionSerializer(perms, many=True).data)

    @action(detail=True, methods=['post'], url_path='permissions/grant')
    def grant_permission(self, request, pk=None):
        """Grant or update a user's role on this tree."""
        tree = self.get_object()
        assert_tree_role(request.user, tree, ['owner'])

        user_id = request.data.get('user_id')
        role = request.data.get('role', 'viewer')

        if role not in dict(TreePermission.ROLE_CHOICES):
            raise ValidationError(f'Invalid role. Choose from: {list(dict(TreePermission.ROLE_CHOICES).keys())}')

        from django.contrib.auth.models import User
        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise NotFound('User not found.')

        perm, created = TreePermission.objects.get_or_create(
            tree=tree, user=target_user,
            defaults={'role': role, 'status': 'active', 'invited_by': request.user}
        )
        if not created:
            perm.role = role
            perm.status = 'active'
            perm.save()

        return Response(TreePermissionSerializer(perm).data)

    @action(detail=True, methods=['get'])
    def updates(self, request, pk=None):
        """Get the social feed updates for a tree."""
        tree = self.get_object()
        updates = FamilyUpdate.objects.filter(tree=tree).select_related('created_by')
        serializer = FamilyUpdateSerializer(updates, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def pending_changes(self, request, pk=None):
        """Get all pending change requests for a tree (for validators/owners)."""
        tree = self.get_object()
        assert_tree_role(request.user, tree, ['owner', 'validator'])
        pending = ChangeRequest.objects.filter(
            member__tree=tree, status='pending'
        ).select_related('member', 'requested_by')
        return Response(ChangeRequestSerializer(pending, many=True).data)

    @action(detail=True, methods=['patch'])
    def theme(self, request, pk=None):
        """Update the tree's theme preset and/or custom colors. Owner/editor only."""
        tree = self.get_object()
        assert_tree_role(request.user, tree, ['owner', 'editor'])

        allowed_fields = {'theme_preset', 'theme_primary', 'theme_mid', 'theme_light', 'theme_dark'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}

        # Validate hex color fields
        import re
        hex_re = re.compile(r'^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$')
        for field in ('theme_primary', 'theme_mid', 'theme_light', 'theme_dark'):
            val = data.get(field, '')
            if val and not hex_re.match(val):
                raise ValidationError({field: 'Must be a valid hex color, e.g. #15803d'})

        # Validate preset slug if provided
        if 'theme_preset' in data:
            from .theme_presets import PRESET_MAP
            if data['theme_preset'] and data['theme_preset'] not in PRESET_MAP:
                raise ValidationError({'theme_preset': 'Unknown preset slug.'})

        for field, value in data.items():
            setattr(tree, field, value)
        tree.save(update_fields=list(data.keys()))

        serializer = TreeSerializer(tree, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=None)
    def crest(self, request, pk=None):
        """Upload or replace the family crest image. Owner only."""
        from rest_framework.parsers import MultiPartParser
        tree = self.get_object()
        assert_tree_role(request.user, tree, ['owner'])

        image = request.FILES.get('crest_image')
        caption = request.data.get('crest_caption', '')

        if not image and 'crest_caption' not in request.data:
            raise ValidationError('Provide crest_image and/or crest_caption.')

        if image:
            # Validate file type (2MB max, image only)
            allowed_types = ('image/jpeg', 'image/png', 'image/webp')
            if image.content_type not in allowed_types:
                raise ValidationError('Crest must be a JPG, PNG, or WebP image.')
            if image.size > 2 * 1024 * 1024:
                raise ValidationError('Crest image must be 2MB or smaller.')

            # Delete old crest if one exists
            if tree.crest_image:
                tree.crest_image.delete(save=False)

            tree.crest_image = image

        if 'crest_caption' in request.data:
            tree.crest_caption = caption

        tree.save()
        serializer = TreeSerializer(tree, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def presets(self, request):
        """Return all available theme presets grouped by region."""
        from .theme_presets import PRESETS_BY_REGION
        grouped = [
            {'region': region, 'palettes': palettes}
            for region, palettes in PRESETS_BY_REGION.items()
        ]
        return Response(grouped)


# ---------------------------------------------------------------------------
# FamilyMember ViewSet
# ---------------------------------------------------------------------------

class FamilyMemberViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'nickname', 'biography', 'current_location']
    ordering_fields = ['last_name', 'first_name', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = FamilyMember.objects.select_related(
            'birth_date', 'death_date', 'tree', 'added_by', 'user_account'
        )
        if user.is_staff:
            return qs
        return qs.filter(
            Q(tree__created_by=user) |
            Q(tree__permissions__user=user, tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        tree = serializer.validated_data.get('tree')
        if not self.request.user.is_staff:
            assert_tree_role(self.request.user, tree, ['owner', 'editor'])
        serializer.save(added_by=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        if not self.request.user.is_staff:
            assert_tree_role(self.request.user, instance.tree, ['owner', 'editor', 'validator'])
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.is_staff:
            assert_tree_role(self.request.user, instance.tree, ['owner'])
        instance.delete()

    @action(detail=True, methods=['get', 'post'])
    def relationships(self, request, pk=None):
        """Get or create relationships for a family member."""
        member = self.get_object()
        if request.method == 'GET':
            rels = FamilyRelationship.objects.filter(
                Q(from_member=member) | Q(to_member=member)
            ).select_related('from_member', 'to_member')
            return Response(FamilyRelationshipSerializer(rels, many=True).data)

        # POST — create a new relationship
        serializer = FamilyRelationshipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assert_tree_role(request.user, member.tree, ['owner', 'editor'])
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def change_requests(self, request, pk=None):
        """Get all change requests for this member."""
        member = self.get_object()
        requests = ChangeRequest.objects.filter(member=member).select_related(
            'requested_by', 'reviewed_by'
        )
        return Response(ChangeRequestSerializer(requests, many=True).data)

    @action(detail=True, methods=['post'], url_path='propose-change')
    def propose_change(self, request, pk=None):
        """
        Propose a change to a family member's field.
        POST body: { "field_name": "biography", "new_value": "...", "reason": "..." }

        If the tree doesn't require approval, the change is applied immediately.
        """
        member = self.get_object()
        field_name = request.data.get('field_name')
        new_value = request.data.get('new_value')
        reason = request.data.get('reason', '')

        if not field_name or new_value is None:
            raise ValidationError('field_name and new_value are required.')

        # Determine field category
        critical_fields = {'birth_date', 'death_date', 'first_name', 'last_name', 'parent_ids'}
        media_fields = {'photo'}
        basic_fields = {'current_location', 'nickname', 'preferred_name'}

        if field_name in critical_fields:
            category = 'critical'
        elif field_name in media_fields:
            category = 'media'
        elif field_name in basic_fields:
            category = 'basic'
        else:
            category = 'standard'

        # BUG #8 FIX: store proper JSON-serialisable value, not str()
        old_raw = getattr(member, field_name, None)
        if hasattr(old_raw, 'pk'):
            old_value = old_raw.pk          # FK — store PK as int
        elif old_raw is None:
            old_value = None                # JSON null, not the string "None"
        else:
            old_value = old_raw

        # Should we auto-approve?
        auto_approve = False
        tree = member.tree

        if not tree.require_approval_for_edits:
            auto_approve = True
        elif member.user_account == request.user and category in ('basic', 'standard'):
            # Person editing their own profile for basic fields
            auto_approve = True
        elif get_tree_role(request.user, tree) in ('owner',) and category != 'critical':
            auto_approve = True

        cr = ChangeRequest.objects.create(
            member=member,
            requested_by=request.user,
            field_name=field_name,
            field_category=category,
            old_value=old_value,            # BUG #8: now proper JSON (None/int/str)
            new_value=new_value,
            reason=reason,
            status='auto_approved' if auto_approve else 'pending',
            reviewed_by=request.user if auto_approve else None,
            reviewed_at=timezone.now() if auto_approve else None,
            review_notes='Auto-approved.' if auto_approve else '',
        )

        if auto_approve:
            # Apply the change immediately
            _apply_change(member, field_name, new_value)
            # Fire notification
            _notify_change_approved(cr)
        else:
            # Notify validators
            _notify_pending_change(cr)

        return Response(
            ChangeRequestSerializer(cr).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get', 'put', 'patch'])
    def privacy(self, request, pk=None):
        """Get or update the privacy settings for a member."""
        member = self.get_object()
        settings_obj, _ = MemberPrivacySettings.objects.get_or_create(member=member)

        if request.method == 'GET':
            return Response(MemberPrivacySettingsSerializer(settings_obj).data)

        assert_tree_role(request.user, member.tree, ['owner', 'editor'])
        serializer = MemberPrivacySettingsSerializer(
            settings_obj, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def validators(self, request, pk=None):
        """List validators for a member."""
        member = self.get_object()
        assert_tree_role(request.user, member.tree, ['owner', 'validator', 'editor'])
        validators = ChangeRequestValidator.objects.filter(
            member=member, is_active=True
        ).select_related('validator')
        return Response(ChangeRequestValidatorSerializer(validators, many=True).data)


# ---------------------------------------------------------------------------
# FamilyRelationship ViewSet
# ---------------------------------------------------------------------------

class FamilyRelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyRelationshipSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        user = self.request.user
        qs = FamilyRelationship.objects.select_related('from_member', 'to_member')
        if user.is_staff:
            return qs
        return qs.filter(
            Q(from_member__tree__created_by=user) |
            Q(from_member__tree__permissions__user=user,
              from_member__tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        from_member = serializer.validated_data.get('from_member')
        to_member   = serializer.validated_data.get('to_member')
        # BUG #7 FIX: prevent linking members from different trees
        if from_member and to_member and from_member.tree_id != to_member.tree_id:
            from rest_framework.exceptions import ValidationError as VE
            raise VE('Both members must belong to the same tree.')
        assert_tree_role(self.request.user, from_member.tree, ['owner', 'editor'])
        serializer.save(created_by=self.request.user)



# ---------------------------------------------------------------------------
# ChangeRequest ViewSet
# ---------------------------------------------------------------------------

class ChangeRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ChangeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['field_name', 'member__first_name', 'member__last_name']
    ordering_fields = ['created_at', 'status']

    def get_queryset(self):
        user = self.request.user
        qs = ChangeRequest.objects.select_related('member', 'requested_by', 'reviewed_by')
        if user.is_staff:
            return qs
        # Show: requests the user submitted OR requests the user can validate
        return qs.filter(
            Q(requested_by=user) |
            Q(member__tree__permissions__user=user,
              member__tree__permissions__role__in=['owner', 'validator'],
              member__tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        # BUG #9 FIX: verify the requester can access this member's tree
        member = serializer.validated_data.get('member')
        if member and not self.request.user.is_staff:
            role = get_tree_role(self.request.user, member.tree)
            if role not in ('owner', 'editor', 'validator', 'viewer'):
                raise PermissionDenied('You do not have access to this tree.')
        serializer.save(requested_by=self.request.user)


    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a change request and apply the change."""
        cr = self.get_object()
        if cr.status != 'pending':
            raise ValidationError(f'Cannot approve a request with status: {cr.status}')

        # Check the user has permission to approve this category of change
        _assert_can_review(request.user, cr)

        cr.status = 'approved'
        cr.reviewed_by = request.user
        cr.reviewed_at = timezone.now()
        cr.review_notes = request.data.get('review_notes', '')
        cr.save()

        # Apply the change to the member
        _apply_change(cr.member, cr.field_name, cr.new_value)
        _notify_change_approved(cr)

        return Response(ChangeRequestSerializer(cr).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a change request."""
        cr = self.get_object()
        if cr.status != 'pending':
            raise ValidationError(f'Cannot reject a request with status: {cr.status}')

        _assert_can_review(request.user, cr)

        cr.status = 'rejected'
        cr.reviewed_by = request.user
        cr.reviewed_at = timezone.now()
        cr.review_notes = request.data.get('review_notes', 'No reason provided.')
        cr.save()

        _notify_change_rejected(cr)

        return Response(ChangeRequestSerializer(cr).data)

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        """Withdraw a pending change request (only by the requester)."""
        cr = self.get_object()
        if cr.requested_by != request.user:
            raise PermissionDenied('Only the requester can withdraw a change request.')
        if cr.status != 'pending':
            raise ValidationError(f'Cannot withdraw a request with status: {cr.status}')
        cr.status = 'withdrawn'
        cr.save()
        return Response(ChangeRequestSerializer(cr).data)


# ---------------------------------------------------------------------------
# ChangeRequestValidator ViewSet
# ---------------------------------------------------------------------------

class ChangeRequestValidatorViewSet(viewsets.ModelViewSet):
    serializer_class = ChangeRequestValidatorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ChangeRequestValidator.objects.select_related('member', 'validator')
        if user.is_staff:
            return qs
        return qs.filter(
            Q(validator=user) |
            Q(member__tree__permissions__user=user,
              member__tree__permissions__role='owner',
              member__tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        member = serializer.validated_data.get('member')
        assert_tree_role(self.request.user, member.tree, ['owner'])
        serializer.save(assigned_by=self.request.user)


# ---------------------------------------------------------------------------
# FamilyPhoto ViewSet
# ---------------------------------------------------------------------------

class FamilyPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'location_taken']
    ordering_fields = ['uploaded_at', 'date_taken']

    def get_queryset(self):
        user = self.request.user
        qs = FamilyPhoto.objects.prefetch_related('tags').select_related('uploaded_by')
        if user.is_staff:
            return qs
        return qs.filter(
            Q(tree__created_by=user) |
            Q(tree__permissions__user=user, tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        tree = serializer.validated_data.get('tree')
        assert_tree_role(self.request.user, tree, ['owner', 'editor'])
        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=['post'])
    def tag(self, request, pk=None):
        """Tag a family member in this photo."""
        photo = self.get_object()
        serializer = PhotoTagSerializer(data={**request.data, 'photo': photo.pk})
        serializer.is_valid(raise_exception=True)
        serializer.save(tagged_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# FamilyUpdate ViewSet
# ---------------------------------------------------------------------------

class FamilyUpdateViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'likes_count']

    def get_queryset(self):
        user = self.request.user
        qs = FamilyUpdate.objects.prefetch_related('comments', 'related_members')
        if user.is_staff:
            return qs
        return qs.filter(
            Q(tree__created_by=user) |
            Q(tree__permissions__user=user, tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        tree = serializer.validated_data.get('tree')
        assert_tree_role(self.request.user, tree, ['owner', 'editor'])
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        update = self.get_object()
        like, created = UpdateLike.objects.get_or_create(update=update, user=request.user)
        if not created:
            like.delete()
            # BUG #2/#18 FIX: fresh count from DB, not stale update object
            fresh_count = UpdateLike.objects.filter(update=update).count()
            return Response({'liked': False, 'likes_count': fresh_count})
        fresh_count = UpdateLike.objects.filter(update=update).count()
        return Response({'liked': True, 'likes_count': fresh_count}, status=status.HTTP_201_CREATED)


    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        update = self.get_object()
        content = request.data.get('content', '').strip()
        if not content:
            raise ValidationError('Comment content cannot be empty.')
        comment = UpdateComment.objects.create(
            update=update, author=request.user, content=content
        )
        return Response(UpdateCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        update = self.get_object()
        comments = UpdateComment.objects.filter(update=update).select_related('author')
        return Response(UpdateCommentSerializer(comments, many=True).data)


# ---------------------------------------------------------------------------
# TreeInvitation ViewSet
# ---------------------------------------------------------------------------

class TreeInvitationViewSet(viewsets.ModelViewSet):
    serializer_class = TreeInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = TreeInvitation.objects.select_related('tree', 'invited_by')
        if user.is_staff:
            return qs
        return qs.filter(
            Q(invited_by=user) |
            Q(tree__permissions__user=user,
              tree__permissions__role='owner',
              tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        tree = serializer.validated_data.get('tree')
        assert_tree_role(self.request.user, tree, ['owner', 'editor'])
        from datetime import timedelta
        serializer.save(
            invited_by=self.request.user,
            expires_at=timezone.now() + timedelta(days=7),
        )

    @action(detail=False, methods=['post'], url_path='accept', permission_classes=[permissions.AllowAny])
    def accept(self, request):
        """
        Accept an invitation via token.
        POST /api/invitations/accept/ with {"token": "..."}
        """
        token = request.data.get('token')
        if not token:
            raise ValidationError('token is required.')

        try:
            invitation = TreeInvitation.objects.get(
                invitation_token=token, status='pending'
            )
        except TreeInvitation.DoesNotExist:
            raise NotFound('Invalid or expired invitation token.')

        if invitation.expires_at < timezone.now():
            invitation.status = 'expired'
            invitation.save()
            raise ValidationError('This invitation has expired.')

        invitation.status = 'accepted'
        invitation.responded_at = timezone.now()
        invitation.save()

        # If user is authenticated, grant them access
        if request.user.is_authenticated:
            # BUG #12 FIX: use update_or_create so existing permissions get upgraded
            perm, created = TreePermission.objects.update_or_create(
                tree=invitation.tree,
                user=request.user,
                defaults={
                    'role': invitation.role,
                    'status': 'active',
                    'invited_by': invitation.invited_by,
                }
            )
            if not perm.status == 'active':
                perm.status = 'active'
                perm.save(update_fields=['status'])

        return Response({
            'message': 'Invitation accepted.',
            'tree_id': invitation.tree.pk,
            'tree_name': invitation.tree.name,
            'role': invitation.role,
        })


# ---------------------------------------------------------------------------
# Legacy UpdateViewSet
# ---------------------------------------------------------------------------

class UpdateViewSet(viewsets.ModelViewSet):
    """Legacy viewset. Kept for backward compatibility."""
    queryset = Update.objects.all()
    serializer_class = UpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['content', 'member__first_name', 'member__last_name']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return super().get_queryset()
        return Update.objects.filter(
            Q(member__tree__created_by=user) |
            Q(member__tree__permissions__user=user,
              member__tree__permissions__status='active')
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ---------------------------------------------------------------------------
# Internal helpers — change application & notifications
# ---------------------------------------------------------------------------

def _apply_change(member, field_name, new_value):
    """Apply an approved change to a FamilyMember field."""
    # Handle ForeignKey date fields specially
    if field_name in ('birth_date', 'death_date'):
        # new_value should be a FuzzyDate pk or None
        if new_value is None:
            setattr(member, field_name + '_id', None)
        else:
            setattr(member, field_name + '_id', int(new_value))
        # BUG #4 FIX: is_alive sync was inside wrong branch — moved here
        if field_name == 'death_date':
            member.is_alive = (new_value is None)
    elif hasattr(member, field_name):
        setattr(member, field_name, new_value)

    member.save()



def _assert_can_review(user, cr):
    """Assert the user has authority to review this change request."""
    tree = cr.member.tree
    role = get_tree_role(user, tree)

    if role == 'owner':
        return  # Owners can approve anything

    if role == 'validator':
        # Check specific validator permissions
        try:
            validator = ChangeRequestValidator.objects.get(
                member=cr.member, validator=user, is_active=True
            )
        except ChangeRequestValidator.DoesNotExist:
            # Tree-level validator can approve non-critical
            if cr.field_category == 'critical':
                raise PermissionDenied('Only the tree owner can approve critical changes.')
            return

        # Check category-level permission
        category_perm_map = {
            'critical': validator.can_approve_critical,
            'standard': validator.can_approve_standard,
            'media':    validator.can_approve_media,
            'basic':    validator.can_approve_basic,
        }
        if not category_perm_map.get(cr.field_category, False):
            raise PermissionDenied(
                f'You do not have permission to approve {cr.field_category} changes.'
            )
        return

    raise PermissionDenied('Only owners and validators can review change requests.')


def _notify_pending_change(cr):
    """Notify tree validators and owner about a new pending change request."""
    from notifications.models import Notification
    tree = cr.member.tree

    # Notify all owners and validators
    validators = TreePermission.objects.filter(
        tree=tree,
        role__in=['owner', 'validator'],
        status='active',
    ).select_related('user')

    for perm in validators:
        if perm.user == cr.requested_by:
            continue
        Notification.objects.create(
            recipient=perm.user,
            event_type='change_needs_review',
            channel='in_app',
            title=f'Change Request: {cr.field_name}',
            body=(
                f'{cr.requested_by.username} proposed a change to '
                f'{cr.member.display_name}\'s {cr.field_name}.'
            ),
            related_member=cr.member,
            related_tree=tree,
            related_change_request=cr,
            action_url=f'/trees/{tree.pk}/changes/{cr.pk}',
            status='sent',
            sent_at=timezone.now(),
        )


def _notify_change_approved(cr):
    """Notify the requester that their change was approved."""
    from notifications.models import Notification
    Notification.objects.create(
        recipient=cr.requested_by,
        event_type='change_approved',
        channel='in_app',
        title='Change Approved',
        body=f'Your change to {cr.member.display_name}\'s {cr.field_name} has been approved.',
        related_member=cr.member,
        related_tree=cr.member.tree,
        related_change_request=cr,
        action_url=f'/members/{cr.member.pk}',
        status='sent',
        sent_at=timezone.now(),
    )


def _notify_change_rejected(cr):
    """Notify the requester that their change was rejected."""
    from notifications.models import Notification
    Notification.objects.create(
        recipient=cr.requested_by,
        event_type='change_rejected',
        channel='in_app',
        title='Change Rejected',
        body=(
            f'Your change to {cr.member.display_name}\'s {cr.field_name} was rejected. '
            f'Reason: {cr.review_notes}'
        ),
        related_member=cr.member,
        related_tree=cr.member.tree,
        related_change_request=cr,
        action_url=f'/trees/{cr.member.tree.pk}/changes/{cr.pk}',
        status='sent',
        sent_at=timezone.now(),
    )


# ---------------------------------------------------------------------------
# CalendarEventsViewSet & Public iCal Subscription Feed
# ---------------------------------------------------------------------------

class CalendarEventsViewSet(viewsets.ModelViewSet):
    """
    Handles in-app calendar events, custom event creation, .ics downloads,
    and webcal/iCal live feed subscriptions.
    """
    queryset = FamilyEvent.objects.all()
    serializer_class = FamilyEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        tree_id = self.request.query_params.get('tree_id')

        if tree_id:
            return FamilyEvent.objects.filter(tree_id=tree_id)

        # Return events from all trees user belongs to
        user_trees = TreePermission.objects.filter(
            user=user, status='active'
        ).values_list('tree_id', flat=True)
        return FamilyEvent.objects.filter(tree_id__in=user_trees)

    def perform_create(self, serializer):
        tree = serializer.validated_data['tree']
        assert_tree_role(self.request.user, tree, ['owner', 'admin', 'contributor'])
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        assert_tree_role(self.request.user, instance.tree, ['owner', 'admin', 'contributor'])
        serializer.save()

    def perform_destroy(self, instance):
        assert_tree_role(self.request.user, instance.tree, ['owner', 'admin', 'contributor'])
        instance.delete()

    @action(detail=False, methods=['get'], url_path='aggregated')
    def aggregated_events(self, request):
        """
        Unified JSON endpoint combining birthdays, anniversaries, memorial days,
        and custom family events filtered by Kinship Scope (immediate, lineal, extended, all).
        """
        tree_id = request.query_params.get('tree_id')
        scope = request.query_params.get('scope', 'all').lower()

        if not tree_id:
            raise ValidationError({'tree_id': 'tree_id parameter is required'})

        try:
            tree = Tree.objects.get(pk=tree_id)
        except Tree.DoesNotExist:
            raise NotFound('Family Tree not found')

        assert_tree_role(request.user, tree, ['owner', 'admin', 'contributor', 'viewer'])

        # Kinship Scope Filter Setup
        focus_member = resolve_user_member(request.user, tree)
        kinship_map = compute_kinship_map(focus_member)

        allowed_scopes = {'all'}
        if scope == 'immediate':
            allowed_scopes = {'immediate'}
        elif scope == 'lineal':
            allowed_scopes = {'immediate', 'lineal'}
        elif scope == 'extended':
            allowed_scopes = {'immediate', 'lineal', 'extended'}

        events = []

        # 1. Birthdays
        members_with_bday = FamilyMember.objects.filter(
            tree=tree, birth_date__date__isnull=False
        ).select_related('birth_date')

        for m in members_with_bday:
            k_info = kinship_map.get(m.id, {'scope': 'all', 'label': ''})
            if scope != 'all' and k_info['scope'] not in allowed_scopes:
                continue

            events.append({
                'id': f'bday-{m.id}',
                'uid': f'bday-{m.id}@laracine',
                'title': f'🎂 {m.display_name}\'s Birthday',
                'description': f'Birthday of {m.display_name} in tree "{tree.name}".',
                'start_date': m.birth_date.date.strftime('%Y-%m-%d'),
                'all_day': True,
                'is_recurring': True,
                'category': 'Birthday',
                'member_id': m.id,
                'kinship_label': k_info['label'],
            })

        # 2. Deaths / Memorials
        members_deceased = FamilyMember.objects.filter(
            tree=tree, is_alive=False, death_date__date__isnull=False
        ).select_related('death_date')

        for m in members_deceased:
            k_info = kinship_map.get(m.id, {'scope': 'all', 'label': ''})
            if scope != 'all' and k_info['scope'] not in allowed_scopes:
                continue

            events.append({
                'id': f'memorial-{m.id}',
                'uid': f'memorial-{m.id}@laracine',
                'title': f'🕯️ In Memory of {m.display_name}',
                'description': f'Memorial date for {m.display_name}.',
                'start_date': m.death_date.date.strftime('%Y-%m-%d'),
                'all_day': True,
                'is_recurring': True,
                'category': 'Memorial',
                'member_id': m.id,
                'kinship_label': k_info['label'],
            })

        # 3. Marriages / Anniversaries
        spouses = FamilyRelationship.objects.filter(
            from_member__tree=tree, relationship_type='spouse', start_date__isnull=False
        ).select_related('from_member', 'to_member')

        for rel in spouses:
            k1 = kinship_map.get(rel.from_member_id, {'scope': 'all', 'label': ''})
            k2 = kinship_map.get(rel.to_member_id, {'scope': 'all', 'label': ''})

            # Include if either spouse is in scope
            if scope != 'all' and k1['scope'] not in allowed_scopes and k2['scope'] not in allowed_scopes:
                continue

            events.append({
                'id': f'anniv-{rel.id}',
                'uid': f'anniv-{rel.id}@laracine',
                'title': f'💍 {rel.from_member.display_name} & {rel.to_member.display_name}\'s Anniversary',
                'description': f'Wedding anniversary of {rel.from_member.display_name} and {rel.to_member.display_name}.',
                'start_date': rel.start_date.strftime('%Y-%m-%d'),
                'all_day': True,
                'is_recurring': True,
                'category': 'Anniversary',
                'relationship_id': rel.id,
                'kinship_label': k1['label'] or k2['label'],
            })

        # 4. Custom Family Events
        custom_events = FamilyEvent.objects.filter(tree=tree)
        category_emojis = {
            'reunion': '🎪',
            'gathering': '🎉',
            'ceremony': '🎖️',
            'memorial': '🕯️',
            'other': '📅',
        }

        for fe in custom_events:
            emoji = category_emojis.get(fe.event_type, '📅')
            events.append({
                'id': f'event-{fe.id}',
                'custom_event_id': fe.id,
                'uid': f'event-{fe.id}@laracine',
                'title': f'{emoji} {fe.title}',
                'raw_title': fe.title,
                'description': fe.description,
                'location': fe.location,
                'event_type': fe.event_type,
                'start_date': fe.start_date.isoformat(),
                'end_date': fe.end_date.isoformat() if fe.end_date else None,
                'all_day': False,
                'is_recurring': fe.is_annual_recurring,
                'category': fe.event_type.capitalize(),
                'created_by': fe.created_by.username,
                'kinship_label': 'Family Event',
            })

        return Response({
            'tree_id': tree.id,
            'tree_name': tree.name,
            'scope': scope,
            'count': len(events),
            'events': events,
        })

    @action(detail=False, methods=['get'], url_path='export-ics')
    def export_ics(self, request):
        """Generates a downloadable RFC 5545 .ics file attachment."""
        tree_id = request.query_params.get('tree_id')
        if not tree_id:
            raise ValidationError({'tree_id': 'tree_id parameter is required'})

        try:
            tree = Tree.objects.get(pk=tree_id)
        except Tree.DoesNotExist:
            raise NotFound('Family Tree not found')

        assert_tree_role(request.user, tree, ['owner', 'admin', 'contributor', 'viewer'])

        events_list = self._collect_all_tree_events(tree)
        ics_text = build_ics_feed(tree.name, events_list)

        response = HttpResponse(ics_text, content_type='text/calendar; charset=utf-8')
        filename = f"{tree.name.lower().replace(' ', '_')}_calendar.ics"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get', 'post'], url_path='feed-token')
    def feed_token(self, request):
        """Generates or retrieves live webcal/ics feed subscription token."""
        tree_id = request.query_params.get('tree_id') or request.data.get('tree_id')
        if not tree_id:
            raise ValidationError({'tree_id': 'tree_id parameter is required'})

        try:
            tree = Tree.objects.get(pk=tree_id)
        except Tree.DoesNotExist:
            raise NotFound('Family Tree not found')

        assert_tree_role(request.user, tree, ['owner', 'admin', 'contributor', 'viewer'])

        token_obj = CalendarFeedToken.get_or_create_token(request.user, tree)
        
        # Build subscription URLs
        domain = request.get_host()
        protocol = 'https' if request.is_secure() else 'http'
        feed_url = f"{protocol}://{domain}/api/calendar/feed/{token_obj.token}.ics"
        webcal_url = f"webcal://{domain}/api/calendar/feed/{token_obj.token}.ics"

        return Response({
            'tree_id': tree.id,
            'token': token_obj.token,
            'feed_url': feed_url,
            'webcal_url': webcal_url,
        })

    def _collect_all_tree_events(self, tree):
        """Helper to collect all formatted event objects for iCal generation."""
        events = []

        # Birthdays
        for m in FamilyMember.objects.filter(tree=tree, birth_date__date__isnull=False):
            events.append({
                'uid': f'bday-{m.id}@laracine',
                'title': f'🎂 {m.display_name}\'s Birthday',
                'description': f'Birthday of {m.display_name} in tree "{tree.name}".',
                'start_date': m.birth_date.date,
                'all_day': True,
                'is_recurring': True,
                'category': 'Birthday',
            })

        # Memorials
        for m in FamilyMember.objects.filter(tree=tree, is_alive=False, death_date__date__isnull=False):
            events.append({
                'uid': f'memorial-{m.id}@laracine',
                'title': f'🕯️ In Memory of {m.display_name}',
                'description': f'Memorial date for {m.display_name}.',
                'start_date': m.death_date.date,
                'all_day': True,
                'is_recurring': True,
                'category': 'Memorial',
            })

        # Anniversaries
        for rel in FamilyRelationship.objects.filter(from_member__tree=tree, relationship_type='spouse', start_date__isnull=False):
            events.append({
                'uid': f'anniv-{rel.id}@laracine',
                'title': f'💍 {rel.from_member.display_name} & {rel.to_member.display_name}\'s Anniversary',
                'description': f'Wedding anniversary of {rel.from_member.display_name} and {rel.to_member.display_name}.',
                'start_date': rel.start_date,
                'all_day': True,
                'is_recurring': True,
                'category': 'Anniversary',
            })

        # Custom Events
        for fe in FamilyEvent.objects.filter(tree=tree):
            events.append({
                'uid': f'event-{fe.id}@laracine',
                'title': fe.title,
                'description': fe.description,
                'location': fe.location,
                'start_date': fe.start_date,
                'end_date': fe.end_date,
                'all_day': False,
                'is_recurring': fe.is_annual_recurring,
                'category': fe.event_type.capitalize(),
            })

        return events


@api_view(['GET'])
@permission_classes([AllowAny])
def public_calendar_feed(request, token):
    """
    Public unauthenticated endpoint for external calendar subscription (webcal:// / https://).
    Allows Google Calendar, Apple Calendar, and Outlook to fetch live .ics updates.
    """
    try:
        tok_obj = CalendarFeedToken.objects.select_related('tree', 'user').get(token=token)
    except CalendarFeedToken.DoesNotExist:
        return HttpResponse('Invalid or expired calendar feed token.', status=404, content_type='text/plain')

    tree = tok_obj.tree
    viewset = CalendarEventsViewSet()
    events_list = viewset._collect_all_tree_events(tree)
    ics_text = build_ics_feed(tree.name, events_list)

    response = HttpResponse(ics_text, content_type='text/calendar; charset=utf-8')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response
