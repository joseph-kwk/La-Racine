"""
tree/admin.py — Admin registration for all tree models
"""

from django.contrib import admin
from .models import (
    FuzzyDate, Tree, TreePermission, FamilyMember, FamilyRelationship,
    MemberPrivacySettings, ChangeRequest, ChangeRequestValidator,
    FamilyPhoto, PhotoTag, FamilyUpdate, UpdateComment, UpdateLike,
    TreeInvitation, Update,
)


@admin.register(FuzzyDate)
class FuzzyDateAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'precision', 'date', 'bce')
    list_filter = ('precision', 'bce')


@admin.register(Tree)
class TreeAdmin(admin.ModelAdmin):
    list_display = ('name', 'tree_type', 'privacy_level', 'created_by', 'created_at', 'require_approval_for_edits')
    list_filter = ('tree_type', 'privacy_level', 'require_approval_for_edits')
    search_fields = ('name', 'created_by__username')
    raw_id_fields = ('created_by',)


@admin.register(TreePermission)
class TreePermissionAdmin(admin.ModelAdmin):
    list_display = ('user', 'tree', 'role', 'status', 'created_at')
    list_filter = ('role', 'status')
    search_fields = ('user__username', 'tree__name')


class FamilyRelationshipInline(admin.TabularInline):
    model = FamilyRelationship
    fk_name = 'from_member'
    extra = 0
    fields = ('to_member', 'relationship_type', 'is_biological', 'is_current')


@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'tree', 'gender', 'birth_date', 'death_date', 'is_alive', 'privacy_level')
    list_filter = ('gender', 'is_alive', 'privacy_level', 'tree')
    search_fields = ('first_name', 'last_name', 'nickname', 'biography')
    raw_id_fields = ('tree', 'birth_date', 'death_date', 'user_account', 'added_by')
    inlines = [FamilyRelationshipInline]
    fieldsets = (
        ('Identity', {
            'fields': ('tree', 'first_name', 'last_name', 'maiden_name', 'nickname', 'preferred_name', 'gender')
        }),
        ('Dates', {
            'fields': ('birth_date', 'death_date', 'is_alive')
        }),
        ('Locations', {
            'fields': ('birth_location', 'birth_lat', 'birth_lng', 'current_location', 'death_location')
        }),
        ('Personal', {
            'fields': ('occupation', 'education', 'biography', 'nationality', 'ethnicity', 'religion', 'notes')
        }),
        ('Media', {
            'fields': ('photo',)
        }),
        ('Privacy & Consent', {
            'fields': ('privacy_level', 'requires_consent', 'consent_given', 'consent_date')
        }),
        ('Account', {
            'fields': ('user_account', 'added_by')
        }),
    )


@admin.register(FamilyRelationship)
class FamilyRelationshipAdmin(admin.ModelAdmin):
    list_display = ('from_member', 'relationship_type', 'to_member', 'is_biological', 'is_current')
    list_filter = ('relationship_type', 'is_biological', 'is_current')
    search_fields = ('from_member__first_name', 'to_member__first_name')


@admin.register(MemberPrivacySettings)
class MemberPrivacySettingsAdmin(admin.ModelAdmin):
    list_display = ('member', 'basic_info_level', 'birth_date_level', 'photos_level')


@admin.register(ChangeRequest)
class ChangeRequestAdmin(admin.ModelAdmin):
    list_display = ('member', 'field_name', 'field_category', 'requested_by', 'status', 'created_at')
    list_filter = ('status', 'field_category')
    search_fields = ('member__first_name', 'member__last_name', 'field_name', 'requested_by__username')
    raw_id_fields = ('member', 'requested_by', 'reviewed_by')
    readonly_fields = ('old_value', 'created_at', 'updated_at')


@admin.register(ChangeRequestValidator)
class ChangeRequestValidatorAdmin(admin.ModelAdmin):
    list_display = ('validator', 'member', 'can_approve_critical', 'can_approve_standard', 'is_active')
    list_filter = ('is_active', 'can_approve_critical')
    search_fields = ('validator__username', 'member__first_name')


@admin.register(FamilyPhoto)
class FamilyPhotoAdmin(admin.ModelAdmin):
    list_display = ('title', 'tree', 'uploaded_by', 'date_taken', 'privacy_level')
    list_filter = ('privacy_level', 'tree')


@admin.register(FamilyUpdate)
class FamilyUpdateAdmin(admin.ModelAdmin):
    list_display = ('title', 'update_type', 'tree', 'created_by', 'created_at', 'likes_count', 'comments_count')
    list_filter = ('update_type', 'is_public')
    search_fields = ('title', 'content')


@admin.register(TreeInvitation)
class TreeInvitationAdmin(admin.ModelAdmin):
    list_display = ('invited_email', 'tree', 'role', 'status', 'expires_at', 'invited_by')
    list_filter = ('status', 'role')
    search_fields = ('invited_email', 'tree__name')
    readonly_fields = ('invitation_token',)
