"""
tree/serializers.py — Serializers for all tree-related models

Covers:
- FuzzyDate
- Tree & TreePermission
- FamilyMember & FamilyRelationship
- MemberPrivacySettings
- ChangeRequest & ChangeRequestValidator
- FamilyPhoto & PhotoTag
- FamilyUpdate, UpdateComment, UpdateLike
- TreeInvitation
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    FuzzyDate, Tree, TreePermission, FamilyMember, FamilyRelationship,
    MemberPrivacySettings, ChangeRequest, ChangeRequestValidator,
    FamilyPhoto, PhotoTag, FamilyUpdate, UpdateComment, UpdateLike,
    TreeInvitation, Update,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_user_tree_role(user, tree):
    """Return the user's role string on a given tree, or None."""
    if not user or not user.is_authenticated:
        return None
    if user.is_staff:
        return 'owner'
    try:
        perm = TreePermission.objects.get(tree=tree, user=user, status='active')
        return perm.role
    except TreePermission.DoesNotExist:
        return None


# ---------------------------------------------------------------------------
# FuzzyDate
# ---------------------------------------------------------------------------

class FuzzyDateSerializer(serializers.ModelSerializer):
    display = serializers.SerializerMethodField()

    class Meta:
        model = FuzzyDate
        fields = ('id', 'date', 'precision', 'bce', 'display_text', 'display')
        read_only_fields = ('id',)

    def get_display(self, obj):
        return str(obj)


# ---------------------------------------------------------------------------
# Tree
# ---------------------------------------------------------------------------

class TreeSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True, default=0)
    relationship_count = serializers.IntegerField(read_only=True, default=0)
    role = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    # Computed theme: merges preset defaults with any custom overrides
    resolved_theme = serializers.SerializerMethodField()

    class Meta:
        model = Tree
        fields = (
            'id', 'name', 'description', 'tree_type', 'privacy_level',
            'require_approval_for_edits', 'allow_member_invites', 'primary_language',
            'created_by', 'created_by_username', 'created_at', 'updated_at',
            'member_count', 'relationship_count', 'role',
            # Theme & identity
            'theme_preset', 'theme_primary', 'theme_mid', 'theme_light', 'theme_dark',
            'crest_image', 'crest_caption',
            'resolved_theme',
        )
        read_only_fields = ('id', 'created_by', 'created_by_username',
                            'created_at', 'updated_at', 'resolved_theme')

    def get_role(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        return get_user_tree_role(request.user, obj)

    def get_resolved_theme(self, obj):
        """
        Returns the effective theme colors — custom fields take priority over preset defaults.
        The frontend uses this so it never has to know preset defaults itself.
        """
        from .theme_presets import PRESET_MAP
        preset = PRESET_MAP.get(obj.theme_preset or 'emerald_root', PRESET_MAP['emerald_root'])
        return {
            'primary': obj.theme_primary or preset['primary'],
            'mid':     obj.theme_mid     or preset['mid'],
            'light':   obj.theme_light   or preset['light'],
            'dark':    obj.theme_dark    or preset['dark'],
            'preset':  obj.theme_preset  or 'emerald_root',
        }


class TreePermissionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_display = serializers.SerializerMethodField()

    class Meta:
        model = TreePermission
        fields = ('id', 'tree', 'user', 'username', 'user_display', 'role', 'status', 'invited_by', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_user_display(self, obj):
        profile = getattr(obj.user, 'profile', None)
        if profile:
            return profile.display_name or obj.user.username
        return obj.user.username


# ---------------------------------------------------------------------------
# FamilyMember
# ---------------------------------------------------------------------------

class FamilyMemberSerializer(serializers.ModelSerializer):
    birth_date_detail = FuzzyDateSerializer(source='birth_date', read_only=True)
    death_date_detail = FuzzyDateSerializer(source='death_date', read_only=True)
    full_name = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField()
    deceased = serializers.ReadOnlyField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = FamilyMember
        fields = (
            'id', 'tree',
            # Names
            'first_name', 'last_name', 'maiden_name', 'nickname', 'preferred_name',
            'gender', 'full_name', 'display_name',
            # Dates
            'birth_date', 'birth_date_detail',
            'death_date', 'death_date_detail',
            'deceased', 'is_alive',
            # Age
            'show_age', 'age',
            # Locations
            'birth_location', 'birth_lat', 'birth_lng',
            'current_location', 'death_location',
            # Details
            'occupation', 'education', 'biography', 'nationality', 'ethnicity', 'religion',
            'notes', 'photo',
            # Privacy & consent
            'privacy_level', 'requires_consent', 'consent_given',
            # Links
            'user_account', 'relationship',
            # Meta
            'added_by', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'full_name', 'display_name', 'deceased', 'age', 'added_by', 'created_at', 'updated_at')

    def get_age(self, obj):
        """Return age as a display string."""
        if not obj.show_age:
            return None
        result = obj.age
        if result is None:
            return None
        years, is_exact = result
        if is_exact:
            return f'{years} years old'
        return f'~{years} years old'

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        tree = attrs.get('tree') or getattr(self.instance, 'tree', None)

        if user and not getattr(user, 'is_staff', False) and tree:
            has_permission = TreePermission.objects.filter(
                tree=tree,
                user=user,
                role__in=['owner', 'editor', 'validator'],
                status='active'
            ).exists()
            if not has_permission:
                raise serializers.ValidationError(
                    'You do not have permission to edit this tree.'
                )
        return attrs


class FamilyMemberLightSerializer(serializers.ModelSerializer):
    """Lightweight serializer for embedding in other responses."""
    class Meta:
        model = FamilyMember
        fields = ('id', 'first_name', 'last_name', 'display_name', 'photo', 'is_alive')
        read_only_fields = fields


# ---------------------------------------------------------------------------
# FamilyRelationship
# ---------------------------------------------------------------------------

class FamilyRelationshipSerializer(serializers.ModelSerializer):
    from_member_name = serializers.CharField(source='from_member.display_name', read_only=True)
    to_member_name = serializers.CharField(source='to_member.display_name', read_only=True)
    relationship_display = serializers.CharField(source='get_relationship_type_display', read_only=True)

    class Meta:
        model = FamilyRelationship
        fields = (
            'id', 'from_member', 'from_member_name',
            'to_member', 'to_member_name',
            'relationship_type', 'relationship_display',
            'start_date', 'end_date',
            'is_biological', 'is_current', 'notes',
            'created_by', 'created_at',
        )
        read_only_fields = ('id', 'from_member_name', 'to_member_name', 'relationship_display', 'created_at')


# ---------------------------------------------------------------------------
# MemberPrivacySettings
# ---------------------------------------------------------------------------

class MemberPrivacySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberPrivacySettings
        fields = '__all__'
        read_only_fields = ('id', 'member', 'updated_at')


# ---------------------------------------------------------------------------
# ChangeRequest & ChangeRequestValidator
# ---------------------------------------------------------------------------

class ChangeRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(
        source='requested_by.username', read_only=True
    )
    reviewed_by_username = serializers.CharField(
        source='reviewed_by.username', read_only=True
    )
    member_name = serializers.CharField(
        source='member.display_name', read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )

    class Meta:
        model = ChangeRequest
        fields = (
            'id', 'member', 'member_name',
            'requested_by', 'requested_by_username',
            'field_name', 'field_category',
            'old_value', 'new_value', 'reason',
            'status', 'status_display',
            'reviewed_by', 'reviewed_by_username',
            'reviewed_at', 'review_notes',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'requested_by', 'requested_by_username',
            'member_name', 'status_display',
            'reviewed_by', 'reviewed_by_username',
            'reviewed_at', 'created_at', 'updated_at',
        )


class ChangeRequestValidatorSerializer(serializers.ModelSerializer):
    validator_username = serializers.CharField(
        source='validator.username', read_only=True
    )
    member_name = serializers.CharField(
        source='member.display_name', read_only=True
    )

    class Meta:
        model = ChangeRequestValidator
        fields = (
            'id', 'member', 'member_name',
            'validator', 'validator_username',
            'assigned_by',
            'can_approve_critical', 'can_approve_standard',
            'can_approve_media', 'can_approve_basic',
            'assigned_at', 'is_active',
        )
        read_only_fields = ('id', 'member_name', 'validator_username', 'assigned_at')


# ---------------------------------------------------------------------------
# FamilyPhoto & PhotoTag
# ---------------------------------------------------------------------------

class PhotoTagSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.display_name', read_only=True)

    class Meta:
        model = PhotoTag
        fields = ('id', 'photo', 'member', 'member_name', 'x_coordinate', 'y_coordinate',
                  'tagged_by', 'tagged_at', 'confirmed')
        read_only_fields = ('id', 'member_name', 'tagged_by', 'tagged_at')


class FamilyPhotoSerializer(serializers.ModelSerializer):
    tags = PhotoTagSerializer(many=True, read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = FamilyPhoto
        fields = (
            'id', 'tree', 'image', 'title', 'description',
            'date_taken', 'location_taken', 'privacy_level',
            'uploaded_by', 'uploaded_by_username', 'uploaded_at',
            'tags',
        )
        read_only_fields = ('id', 'uploaded_by', 'uploaded_by_username', 'uploaded_at')


# ---------------------------------------------------------------------------
# FamilyUpdate, UpdateComment, UpdateLike
# ---------------------------------------------------------------------------

class UpdateCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = UpdateComment
        fields = ('id', 'update', 'author', 'author_username', 'content', 'created_at')
        read_only_fields = ('id', 'author', 'author_username', 'created_at')


class UpdateLikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpdateLike
        fields = ('id', 'update', 'user', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')


class FamilyUpdateSerializer(serializers.ModelSerializer):
    comments = UpdateCommentSerializer(many=True, read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    update_type_display = serializers.CharField(source='get_update_type_display', read_only=True)

    class Meta:
        model = FamilyUpdate
        fields = (
            'id', 'tree', 'related_members', 'title', 'content',
            'update_type', 'update_type_display',
            'featured_image', 'document',
            'is_public', 'visible_to_guests',
            'created_by', 'created_by_username',
            'created_at', 'updated_at',
            'likes_count', 'comments_count',
            'comments',
        )
        read_only_fields = (
            'id', 'created_by', 'created_by_username',
            'created_at', 'updated_at', 'likes_count', 'comments_count',
            'update_type_display',
        )


# ---------------------------------------------------------------------------
# TreeInvitation
# ---------------------------------------------------------------------------

class TreeInvitationSerializer(serializers.ModelSerializer):
    invited_by_username = serializers.CharField(source='invited_by.username', read_only=True)
    tree_name = serializers.CharField(source='tree.name', read_only=True)

    class Meta:
        model = TreeInvitation
        fields = (
            'id', 'tree', 'tree_name',
            'invited_email', 'invited_name', 'role',
            'related_member', 'invitation_message',
            'status', 'invited_by', 'invited_by_username',
            'created_at', 'expires_at', 'responded_at',
            # Note: invitation_token is excluded — never send to client responses
        )
        read_only_fields = (
            'id', 'invited_by', 'invited_by_username', 'tree_name',
            'created_at', 'responded_at', 'invitation_token',
        )


# ---------------------------------------------------------------------------
# Legacy
# ---------------------------------------------------------------------------

class UpdateSerializer(serializers.ModelSerializer):
    """Legacy Update serializer."""
    class Meta:
        model = Update
        fields = '__all__'
        read_only_fields = ('created_by', 'timestamp')
