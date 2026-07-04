"""
core/admin.py — Admin for UserProfile
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    extra = 0
    fields = (
        'display_name', 'nickname', 'profile_photo', 'bio',
        'current_location', 'birthday', 'preferred_language',
        'timezone', 'theme_preference', 'linked_member',
        'is_email_verified', 'is_phone_verified',
    )


class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined')


# Re-register User with the enhanced admin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'display_name', 'preferred_language', 'linked_member', 'is_email_verified')
    search_fields = ('user__username', 'display_name', 'nickname')
    list_filter = ('preferred_language', 'is_email_verified', 'theme_preference')
    raw_id_fields = ('linked_member',)
