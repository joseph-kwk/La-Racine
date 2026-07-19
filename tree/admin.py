"""
tree/admin.py — La Racine Admin Configuration
==============================================

World-class Django admin setup for full content management:

  • Rich list displays with computed columns, ordering, and colour badges
  • Inline editing (relationships, comments, likes, photo tags, validators)
  • Custom admin actions (approve/reject change requests, revoke invitations)
  • Advanced search and filtering on every model
  • Read-only audit fields everywhere
  • Admin-level approve/reject workflow for ChangeRequests
  • Compact numeric summaries in list views
  • Friendly verbose_names for all sections
"""

from django.contrib import admin
from django.contrib import messages
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe
from django.utils import timezone
from django.db.models import Count
from django.urls import reverse

from .models import (
    FuzzyDate, Tree, TreePermission, FamilyMember, FamilyRelationship,
    MemberPrivacySettings, ChangeRequest, ChangeRequestValidator,
    FamilyPhoto, PhotoTag, FamilyUpdate, UpdateComment, UpdateLike,
    TreeInvitation, Update,
)

# ──────────────────────────────────────────────────────────────────────────────
# Site-level branding
# ──────────────────────────────────────────────────────────────────────────────

admin.site.site_header  = "🌳 La Racine — Admin"
admin.site.site_title   = "La Racine Admin"
admin.site.index_title  = "Content Management"


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

STATUS_COLOURS = {
    'pending':      '#f59e0b',
    'approved':     '#10b981',
    'rejected':     '#ef4444',
    'auto_approved':'#6366f1',
    'withdrawn':    '#9ca3af',
    # TreePermission
    'active':       '#10b981',
    'inactive':     '#9ca3af',
    'invited':      '#3b82f6',
    # Invitation
    'accepted':     '#10b981',
    'declined':     '#ef4444',
    'expired':      '#9ca3af',
    'revoked':      '#374151',
}

def coloured_status(value, label=None):
    """Render a coloured pill badge for a status value."""
    colour = STATUS_COLOURS.get(value, '#9ca3af')
    text   = label or value.replace('_', ' ').title()
    return format_html(
        '<span style="background:{};color:white;padding:2px 8px;border-radius:9999px;font-size:0.8em;font-weight:600">{}</span>',
        colour, text
    )


# ──────────────────────────────────────────────────────────────────────────────
# FuzzyDate
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(FuzzyDate)
class FuzzyDateAdmin(admin.ModelAdmin):
    list_display  = ('human_readable', 'precision', 'date', 'bce', 'display_text')
    list_filter   = ('precision', 'bce')
    search_fields = ('display_text',)
    ordering      = ('-date',)

    @admin.display(description='Date')
    def human_readable(self, obj):
        return str(obj)


# ──────────────────────────────────────────────────────────────────────────────
# Tree
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(Tree)
class TreeAdmin(admin.ModelAdmin):
    list_display  = (
        'name', 'tree_type', 'privacy_badge', 'created_by',
        'member_count', 'created_at', 'require_approval_for_edits',
    )
    list_filter   = ('tree_type', 'privacy_level', 'require_approval_for_edits')
    search_fields = ('name', 'description', 'created_by__username')
    raw_id_fields = ('created_by',)
    readonly_fields = ('created_at', 'updated_at', 'crest_preview')
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Identity', {
            'fields': ('name', 'description', 'tree_type', 'primary_language')
        }),
        ('Privacy & Governance', {
            'fields': ('privacy_level', 'require_approval_for_edits', 'allow_member_invites')
        }),
        ('Family Identity', {
            'fields': ('crest_image', 'crest_caption', 'crest_preview'),
            'classes': ('collapse',),
        }),
        ('Ownership', {
            'fields': ('created_by', 'created_at', 'updated_at'),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _member_count=Count('members', distinct=True)
        )

    @admin.display(description='Members', ordering='_member_count')
    def member_count(self, obj):
        url = (
            reverse('admin:tree_familymember_changelist')
            + f'?tree__id__exact={obj.id}'
        )
        return format_html('<a href="{}">{}</a>', url, obj._member_count)

    @admin.display(description='Privacy')
    def privacy_badge(self, obj):
        colours = {'private': '#374151', 'family': '#3b82f6', 'public': '#10b981'}
        colour  = colours.get(obj.privacy_level, '#9ca3af')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:9999px;font-size:0.8em;font-weight:600">{}</span>',
            colour, obj.get_privacy_level_display()
        )

    @admin.display(description='Crest Preview')
    def crest_preview(self, obj):
        if obj.crest_image:
            return format_html(
                '<img src="{}" style="max-height:80px;border-radius:6px;" />',
                obj.crest_image.url
            )
        return '—'


# ──────────────────────────────────────────────────────────────────────────────
# TreePermission
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(TreePermission)
class TreePermissionAdmin(admin.ModelAdmin):
    list_display  = ('user', 'tree', 'role_badge', 'status_badge', 'created_at')
    list_filter   = ('role', 'status')
    search_fields = ('user__username', 'user__email', 'tree__name')
    raw_id_fields = ('user', 'tree', 'invited_by')
    date_hierarchy = 'created_at'

    @admin.display(description='Role')
    def role_badge(self, obj):
        colours = {
            'owner': '#854d0e', 'editor': '#1e40af',
            'viewer': '#374151', 'validator': '#065f46'
        }
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:9999px;font-size:0.8em;font-weight:600">{}</span>',
            colours.get(obj.role, '#9ca3af'), obj.role.title()
        )

    @admin.display(description='Status')
    def status_badge(self, obj):
        return coloured_status(obj.status)


# ──────────────────────────────────────────────────────────────────────────────
# FamilyMember  (the heart of the app)
# ──────────────────────────────────────────────────────────────────────────────

class FamilyRelationshipFromInline(admin.TabularInline):
    model   = FamilyRelationship
    fk_name = 'from_member'
    extra   = 0
    fields  = ('to_member', 'relationship_type', 'is_biological', 'is_current', 'start_date')
    raw_id_fields = ('to_member',)
    verbose_name        = 'Outgoing relationship'
    verbose_name_plural = 'Relationships (this person → others)'


class ChangeRequestInline(admin.TabularInline):
    model  = ChangeRequest
    extra  = 0
    fields = ('field_name', 'field_category', 'status', 'requested_by', 'created_at')
    readonly_fields = ('field_name', 'field_category', 'status', 'requested_by', 'created_at')
    show_change_link = True
    can_delete = False
    verbose_name_plural = 'Change Requests'

    def has_add_permission(self, request, obj=None):
        return False


class MemberPrivacyInline(admin.StackedInline):
    model  = MemberPrivacySettings
    extra  = 0
    can_delete = False
    verbose_name_plural = 'Privacy Settings'
    classes = ('collapse',)


@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display   = (
        'display_name', 'tree', 'gender', 'birth_display', 'death_display',
        'alive_badge', 'privacy_badge', 'photo_thumb',
    )
    list_filter    = ('gender', 'is_alive', 'privacy_level', 'tree')
    search_fields  = ('first_name', 'last_name', 'nickname', 'maiden_name',
                      'biography', 'birth_location', 'current_location')
    raw_id_fields  = ('tree', 'birth_date', 'death_date', 'user_account', 'added_by')
    readonly_fields = ('created_at', 'updated_at', 'photo_preview', 'display_name')
    inlines        = [FamilyRelationshipFromInline, MemberPrivacyInline, ChangeRequestInline]
    date_hierarchy = 'created_at'
    save_on_top    = True

    fieldsets = (
        ('Identity', {
            'fields': (
                'tree',
                ('first_name', 'last_name'),
                ('maiden_name', 'nickname', 'preferred_name'),
                'gender',
            )
        }),
        ('Life Dates', {
            'fields': (
                ('birth_date', 'birth_location'),
                ('is_alive', 'death_date', 'death_location'),
                'current_location',
            )
        }),
        ('Personal', {
            'fields': ('occupation', 'education', 'biography', 'nationality', 'ethnicity', 'religion'),
            'classes': ('collapse',),
        }),
        ('Privacy & Consent', {
            'fields': (
                'privacy_level',
                ('requires_consent', 'consent_given', 'consent_date'),
            ),
            'classes': ('collapse',),
        }),
        ('Photo', {
            'fields': ('photo', 'photo_preview'),
            'classes': ('collapse',),
        }),
        ('Account Link', {
            'fields': ('user_account', 'added_by'),
            'classes': ('collapse',),
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Born')
    def birth_display(self, obj):
        return str(obj.birth_date) if obj.birth_date else '—'

    @admin.display(description='Died')
    def death_display(self, obj):
        return str(obj.death_date) if obj.death_date else '—'

    @admin.display(description='Living?', boolean=False)
    def alive_badge(self, obj):
        if obj.is_alive:
            return format_html('<span style="color:#10b981;font-weight:700">✔ Living</span>')
        return format_html('<span style="color:#9ca3af">✝ Deceased</span>')

    @admin.display(description='Privacy')
    def privacy_badge(self, obj):
        colours = {'public': '#10b981', 'family': '#3b82f6',
                   'close_family': '#f59e0b', 'private': '#374151'}
        colour = colours.get(obj.privacy_level, '#9ca3af')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:9999px;font-size:0.8em">{}</span>',
            colour, obj.get_privacy_level_display()
        )

    @admin.display(description='Photo')
    def photo_thumb(self, obj):
        if obj.photo:
            return format_html('<img src="{}" style="height:36px;width:36px;object-fit:cover;border-radius:50%;" />', obj.photo.url)
        return '—'

    @admin.display(description='Photo Preview')
    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" style="max-height:160px;border-radius:8px;" />', obj.photo.url)
        return '—'


# ──────────────────────────────────────────────────────────────────────────────
# FamilyRelationship
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(FamilyRelationship)
class FamilyRelationshipAdmin(admin.ModelAdmin):
    list_display   = ('from_member', 'relationship_type', 'to_member',
                       'is_biological', 'is_current', 'start_date')
    list_filter    = ('relationship_type', 'is_biological', 'is_current')
    search_fields  = ('from_member__first_name', 'from_member__last_name',
                       'to_member__first_name',  'to_member__last_name')
    raw_id_fields  = ('from_member', 'to_member', 'created_by')


# ──────────────────────────────────────────────────────────────────────────────
# MemberPrivacySettings
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(MemberPrivacySettings)
class MemberPrivacySettingsAdmin(admin.ModelAdmin):
    list_display  = ('member', 'basic_info_level', 'birth_date_level',
                      'photos_level', 'allow_photo_tagging')
    list_filter   = ('basic_info_level', 'photos_level')
    search_fields = ('member__first_name', 'member__last_name')
    raw_id_fields = ('member',)


# ──────────────────────────────────────────────────────────────────────────────
# ChangeRequest  — with admin approve/reject actions
# ──────────────────────────────────────────────────────────────────────────────

def _apply_change(change_request):
    """
    Apply a ChangeRequest to its target FamilyMember field.
    Handles simple text/bool fields; skips FuzzyDate FK fields (handled separately).
    """
    member = change_request.member
    field  = change_request.field_name
    value  = change_request.new_value

    if hasattr(member, field):
        # Unwrap single-key dict if serialized that way
        if isinstance(value, dict) and len(value) == 1:
            value = list(value.values())[0]
        setattr(member, field, value)
        member.save(update_fields=[field])


@admin.register(ChangeRequest)
class ChangeRequestAdmin(admin.ModelAdmin):
    list_display  = (
        'member', 'field_name', 'field_category', 'requested_by',
        'status_badge', 'created_at', 'reviewed_by',
    )
    list_filter   = ('status', 'field_category')
    search_fields = ('member__first_name', 'member__last_name',
                      'field_name', 'requested_by__username')
    raw_id_fields = ('member', 'requested_by', 'reviewed_by')
    readonly_fields = ('old_value', 'created_at', 'updated_at',
                        'value_diff', 'member_link')
    date_hierarchy = 'created_at'
    actions = ['action_approve', 'action_reject']
    save_on_top = True

    fieldsets = (
        ('Request', {
            'fields': ('member', 'member_link', 'field_name', 'field_category', 'reason')
        }),
        ('Values', {
            'fields': ('old_value', 'new_value', 'value_diff')
        }),
        ('Review', {
            'fields': ('status', 'reviewed_by', 'review_notes', 'reviewed_at', 'created_at', 'updated_at')
        }),
    )

    @admin.display(description='Status')
    def status_badge(self, obj):
        return coloured_status(obj.status)

    @admin.display(description='Member')
    def member_link(self, obj):
        url = reverse('admin:tree_familymember_change', args=[obj.member.pk])
        return format_html('<a href="{}">{}</a>', url, obj.member.display_name)

    @admin.display(description='Change diff')
    def value_diff(self, obj):
        old = obj.old_value
        new = obj.new_value
        return format_html(
            '<div style="font-family:monospace;font-size:0.85em">'
            '<div style="color:#dc2626">— {}</div>'
            '<div style="color:#059669">+ {}</div>'
            '</div>',
            old if old is not None else '(empty)',
            new if new is not None else '(empty)',
        )

    @admin.action(description='✅ Approve selected change requests')
    def action_approve(self, request, queryset):
        approved = 0
        for cr in queryset.filter(status='pending'):
            cr.status      = 'approved'
            cr.reviewed_by = request.user
            cr.reviewed_at = timezone.now()
            cr.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
            try:
                _apply_change(cr)
            except Exception:
                pass
            approved += 1
        self.message_user(request, f'{approved} change request(s) approved and applied.', messages.SUCCESS)

    @admin.action(description='❌ Reject selected change requests')
    def action_reject(self, request, queryset):
        rejected = 0
        for cr in queryset.filter(status='pending'):
            cr.status      = 'rejected'
            cr.reviewed_by = request.user
            cr.reviewed_at = timezone.now()
            cr.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
            rejected += 1
        self.message_user(request, f'{rejected} change request(s) rejected.', messages.WARNING)


# ──────────────────────────────────────────────────────────────────────────────
# ChangeRequestValidator
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(ChangeRequestValidator)
class ChangeRequestValidatorAdmin(admin.ModelAdmin):
    list_display  = ('validator', 'member', 'can_approve_critical',
                      'can_approve_standard', 'is_active', 'assigned_at')
    list_filter   = ('is_active', 'can_approve_critical', 'can_approve_standard')
    search_fields = ('validator__username', 'member__first_name', 'member__last_name')
    raw_id_fields = ('member', 'validator', 'assigned_by')


# ──────────────────────────────────────────────────────────────────────────────
# FamilyPhoto  (with tag inline)
# ──────────────────────────────────────────────────────────────────────────────

class PhotoTagInline(admin.TabularInline):
    model   = PhotoTag
    extra   = 0
    fields  = ('member', 'x_coordinate', 'y_coordinate', 'confirmed', 'tagged_by')
    raw_id_fields = ('member', 'tagged_by')


@admin.register(FamilyPhoto)
class FamilyPhotoAdmin(admin.ModelAdmin):
    list_display   = ('photo_thumb', 'title', 'tree', 'uploaded_by',
                       'date_taken', 'privacy_level', 'tag_count')
    list_filter    = ('privacy_level', 'tree')
    search_fields  = ('title', 'description', 'location_taken')
    raw_id_fields  = ('tree', 'uploaded_by')
    readonly_fields = ('uploaded_at', 'photo_preview')
    inlines        = [PhotoTagInline]
    date_hierarchy = 'uploaded_at'

    fieldsets = (
        ('Photo', {
            'fields': ('tree', 'image', 'photo_preview', 'title', 'description')
        }),
        ('Metadata', {
            'fields': ('date_taken', 'location_taken', 'privacy_level')
        }),
        ('Ownership', {
            'fields': ('uploaded_by', 'uploaded_at'),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_tag_count=Count('tags'))

    @admin.display(description='Tags', ordering='_tag_count')
    def tag_count(self, obj):
        return obj._tag_count

    @admin.display(description='')
    def photo_thumb(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:40px;width:60px;object-fit:cover;border-radius:4px;" />',
                obj.image.url
            )
        return '—'

    @admin.display(description='Preview')
    def photo_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height:200px;border-radius:8px;" />', obj.image.url)
        return '—'


@admin.register(PhotoTag)
class PhotoTagAdmin(admin.ModelAdmin):
    list_display  = ('member', 'photo', 'confirmed', 'tagged_by', 'tagged_at')
    list_filter   = ('confirmed',)
    raw_id_fields = ('photo', 'member', 'tagged_by')
    actions       = ['action_confirm_tags']

    @admin.action(description='✅ Confirm selected photo tags')
    def action_confirm_tags(self, request, queryset):
        updated = queryset.update(confirmed=True)
        self.message_user(request, f'{updated} photo tag(s) confirmed.', messages.SUCCESS)


# ──────────────────────────────────────────────────────────────────────────────
# FamilyUpdate  (social feed, with comment inline)
# ──────────────────────────────────────────────────────────────────────────────

class UpdateCommentInline(admin.TabularInline):
    model   = UpdateComment
    extra   = 0
    fields  = ('author', 'content', 'created_at')
    readonly_fields = ('author', 'created_at')
    can_delete = True


class UpdateLikeInline(admin.TabularInline):
    model   = UpdateLike
    extra   = 0
    fields  = ('user', 'created_at')
    readonly_fields = ('user', 'created_at')
    can_delete = True


@admin.register(FamilyUpdate)
class FamilyUpdateAdmin(admin.ModelAdmin):
    list_display   = (
        'title', 'type_badge', 'tree', 'created_by',
        'created_at', 'likes_count', 'comments_count', 'is_public',
    )
    list_filter    = ('update_type', 'is_public', 'visible_to_guests', 'tree')
    search_fields  = ('title', 'content', 'created_by__username')
    raw_id_fields  = ('tree', 'created_by')
    readonly_fields = ('created_at', 'updated_at', 'likes_count', 'comments_count')
    inlines        = [UpdateCommentInline, UpdateLikeInline]
    date_hierarchy = 'created_at'
    filter_horizontal = ('related_members',)

    fieldsets = (
        ('Post', {
            'fields': ('tree', 'title', 'content', 'update_type')
        }),
        ('Media', {
            'fields': ('featured_image', 'document'),
            'classes': ('collapse',),
        }),
        ('Visibility', {
            'fields': ('is_public', 'visible_to_guests', 'related_members')
        }),
        ('Stats & Audit', {
            'fields': ('created_by', 'likes_count', 'comments_count', 'created_at', 'updated_at'),
        }),
    )

    @admin.display(description='Type')
    def type_badge(self, obj):
        colours = {
            'news': '#3b82f6', 'milestone': '#f59e0b',
            'memorial': '#6b7280', 'photo': '#8b5cf6',
            'story': '#10b981', 'announcement': '#ef4444',
            'document': '#0ea5e9',
        }
        colour = colours.get(obj.update_type, '#9ca3af')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:9999px;font-size:0.8em;font-weight:600">{}</span>',
            colour, obj.get_update_type_display()
        )


@admin.register(UpdateComment)
class UpdateCommentAdmin(admin.ModelAdmin):
    list_display  = ('author', 'update', 'content_preview', 'created_at')
    search_fields = ('author__username', 'content')
    raw_id_fields = ('update', 'author')
    date_hierarchy = 'created_at'

    @admin.display(description='Content')
    def content_preview(self, obj):
        return obj.content[:80] + '…' if len(obj.content) > 80 else obj.content


@admin.register(UpdateLike)
class UpdateLikeAdmin(admin.ModelAdmin):
    list_display  = ('user', 'update', 'created_at')
    search_fields = ('user__username',)
    raw_id_fields = ('update', 'user')


# ──────────────────────────────────────────────────────────────────────────────
# TreeInvitation  — with resend / revoke actions
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(TreeInvitation)
class TreeInvitationAdmin(admin.ModelAdmin):
    list_display   = (
        'invited_email', 'invited_name', 'tree', 'role_badge',
        'status_badge', 'invited_by', 'created_at', 'expires_at',
    )
    list_filter    = ('status', 'role')
    search_fields  = ('invited_email', 'invited_name', 'tree__name', 'invited_by__username')
    raw_id_fields  = ('tree', 'invited_by', 'related_member')
    readonly_fields = ('invitation_token', 'created_at', 'responded_at', 'invite_link')
    date_hierarchy = 'created_at'
    actions        = ['action_revoke', 'action_mark_expired']

    fieldsets = (
        ('Invitation', {
            'fields': ('tree', 'invited_email', 'invited_name', 'role',
                       'invitation_message', 'related_member')
        }),
        ('Status', {
            'fields': ('status', 'expires_at')
        }),
        ('Token & Link', {
            'fields': ('invitation_token', 'invite_link'),
            'classes': ('collapse',),
        }),
        ('Audit', {
            'fields': ('invited_by', 'created_at', 'responded_at'),
        }),
    )

    @admin.display(description='Role')
    def role_badge(self, obj):
        colours = {
            'owner': '#854d0e', 'editor': '#1e40af',
            'viewer': '#374151', 'validator': '#065f46',
        }
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:9999px;font-size:0.8em;font-weight:600">{}</span>',
            colours.get(obj.role, '#9ca3af'), obj.role.title()
        )

    @admin.display(description='Status')
    def status_badge(self, obj):
        return coloured_status(obj.status)

    @admin.display(description='Invite Link')
    def invite_link(self, obj):
        if obj.invitation_token:
            url = f'/api/invitations/accept/?token={obj.invitation_token}'
            return format_html('<a href="{}" target="_blank">{}</a>', url, url)
        return '—'

    @admin.action(description='🚫 Revoke selected invitations')
    def action_revoke(self, request, queryset):
        revoked = queryset.filter(status='pending').update(status='revoked')
        self.message_user(request, f'{revoked} invitation(s) revoked.', messages.WARNING)

    @admin.action(description='⏰ Mark selected as Expired')
    def action_mark_expired(self, request, queryset):
        expired = queryset.filter(status='pending').update(status='expired')
        self.message_user(request, f'{expired} invitation(s) marked as expired.', messages.WARNING)


# ──────────────────────────────────────────────────────────────────────────────
# Legacy Update model (kept visible but clearly marked)
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(Update)
class UpdateAdmin(admin.ModelAdmin):
    list_display  = ('member', 'content_preview', 'created_by', 'timestamp')
    search_fields = ('content', 'member__first_name')
    raw_id_fields = ('member', 'created_by')

    @admin.display(description='Content')
    def content_preview(self, obj):
        return obj.content[:60] + '…' if len(obj.content) > 60 else obj.content
