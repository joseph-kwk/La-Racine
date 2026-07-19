"""
core/admin.py — User & Profile Management Admin
================================================

Enhanced admin for User + UserProfile:
- UserProfile embedded inline on the User change page
- Profile photo thumbnail in list view
- Language / theme badges
- Links to a user's linked family member
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from django.urls import reverse

from .models import UserProfile


# ──────────────────────────────────────────────────────────────────────────────
# Inline — embeds profile editing directly on the User change page
# ──────────────────────────────────────────────────────────────────────────────

class UserProfileInline(admin.StackedInline):
    model               = UserProfile
    can_delete          = False
    verbose_name_plural = 'Profile'
    extra               = 0
    fields = (
        'display_name', 'nickname', 'bio',
        'profile_photo', 'birthday', 'current_location',
        'preferred_language', 'timezone', 'theme_preference',
        'linked_member',
        'is_email_verified', 'is_phone_verified', 'phone',
        # notification prefs
        'notify_birthdays_email', 'notify_birthdays_push',
        'notify_new_member_email', 'notify_change_requests_email',
        'notify_photo_tags_email', 'notify_invitations_email',
        'digest_frequency',
    )
    raw_id_fields = ('linked_member',)


# ──────────────────────────────────────────────────────────────────────────────
# Enhanced User admin (replaces default)
# ──────────────────────────────────────────────────────────────────────────────

class UserAdmin(BaseUserAdmin):
    inlines      = (UserProfileInline,)
    list_display = (
        'username', 'email', 'full_name', 'is_staff', 'is_active',
        'profile_photo_thumb', 'language_badge', 'date_joined',
    )
    list_filter  = (
        'is_staff', 'is_superuser', 'is_active',
        'profile__preferred_language', 'profile__is_email_verified',
    )
    search_fields = ('username', 'email', 'first_name', 'last_name',
                     'profile__display_name')

    @admin.display(description='Name')
    def full_name(self, obj):
        name = f'{obj.first_name} {obj.last_name}'.strip()
        return name or '—'

    @admin.display(description='Photo')
    def profile_photo_thumb(self, obj):
        try:
            if obj.profile and obj.profile.profile_photo:
                return format_html(
                    '<img src="{}" style="height:28px;width:28px;'
                    'object-fit:cover;border-radius:50%;" />',
                    obj.profile.profile_photo.url
                )
        except UserProfile.DoesNotExist:
            pass
        return '—'

    @admin.display(description='Language')
    def language_badge(self, obj):
        lang_colours = {
            'en': '#3b82f6', 'fr': '#1d4ed8', 'es': '#d97706',
            'hi': '#7c3aed', 'zh': '#dc2626',
        }
        try:
            lang = obj.profile.preferred_language
            colour = lang_colours.get(lang, '#9ca3af')
            return format_html(
                '<span style="background:{};color:white;padding:1px 7px;'
                'border-radius:9999px;font-size:0.78em;font-weight:600">{}</span>',
                colour, lang.upper()
            )
        except UserProfile.DoesNotExist:
            return '—'


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# ──────────────────────────────────────────────────────────────────────────────
# Standalone UserProfile admin (for bulk management)
# ──────────────────────────────────────────────────────────────────────────────

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display    = (
        'user_link', 'display_name', 'language_badge', 'theme_preference',
        'linked_member_link', 'is_email_verified', 'is_phone_verified',
    )
    list_filter     = (
        'preferred_language', 'is_email_verified', 'theme_preference',
        'digest_frequency',
    )
    search_fields   = ('user__username', 'user__email', 'display_name', 'nickname')
    raw_id_fields   = ('linked_member',)
    readonly_fields = ('profile_photo_preview', 'created_at', 'updated_at')

    fieldsets = (
        ('Identity', {
            'fields': ('user', 'display_name', 'nickname', 'bio')
        }),
        ('Photo', {
            'fields': ('profile_photo', 'profile_photo_preview'),
            'classes': ('collapse',),
        }),
        ('Personal', {
            'fields': ('birthday', 'current_location', 'phone')
        }),
        ('Preferences', {
            'fields': ('preferred_language', 'timezone', 'theme_preference')
        }),
        ('Notifications', {
            'fields': (
                'notify_birthdays_email', 'notify_birthdays_push',
                'notify_new_member_email', 'notify_change_requests_email',
                'notify_photo_tags_email', 'notify_invitations_email',
                'digest_frequency',
            ),
            'classes': ('collapse',),
        }),
        ('Verification', {
            'fields': ('is_email_verified', 'is_phone_verified')
        }),
        ('Family Link', {
            'fields': ('linked_member',)
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:auth_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)

    @admin.display(description='Linked Member')
    def linked_member_link(self, obj):
        if obj.linked_member:
            url = reverse('admin:tree_familymember_change', args=[obj.linked_member.pk])
            return format_html('<a href="{}">{}</a>', url, obj.linked_member.display_name)
        return '—'

    @admin.display(description='Language')
    def language_badge(self, obj):
        lang_colours = {
            'en': '#3b82f6', 'fr': '#1d4ed8', 'es': '#d97706',
            'hi': '#7c3aed', 'zh': '#dc2626',
        }
        colour = lang_colours.get(obj.preferred_language, '#9ca3af')
        return format_html(
            '<span style="background:{};color:white;padding:1px 7px;'
            'border-radius:9999px;font-size:0.78em;font-weight:600">{}</span>',
            colour, obj.preferred_language.upper()
        )

    @admin.display(description='Photo Preview')
    def profile_photo_preview(self, obj):
        if obj.profile_photo:
            return format_html(
                '<img src="{}" style="max-height:120px;border-radius:8px;" />',
                obj.profile_photo.url
            )
        return '—'
