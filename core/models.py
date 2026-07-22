"""
core/models.py — User Profile & Account Extension

Extends Django's built-in User model with:
- Display preferences (name, avatar, language, timezone, theme)
- Link to a FamilyMember record ("claiming" one's own profile)
- Smart Notification preferences (email reserved for critical approvals & invites by default)
- Account verification state
"""

from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """Extended profile for every La Racine user account."""

    THEME_CHOICES = [
        ('system', 'Follow System'),
        ('light',  'Light'),
        ('dark',   'Dark'),
    ]

    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('fr', 'Français'),
        ('es', 'Español'),
        ('hi', 'हिन्दी (Hindi)'),
        ('zh', '中文 (Chinese Simplified)'),
    ]

    DIGEST_CHOICES = [
        ('instant', 'Instant (Important Only)'),
        ('daily',   'Daily Digest'),
        ('weekly',  'Weekly Digest'),
        ('never',   'Never'),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='profile'
    )

    # Display
    display_name = models.CharField(
        max_length=100, blank=True,
        help_text='How your name appears to other family members'
    )
    nickname = models.CharField(max_length=100, blank=True)
    profile_photo = models.ImageField(
        upload_to='profiles/', blank=True, null=True
    )
    bio = models.TextField(blank=True)

    # Location & dates
    current_location = models.CharField(max_length=255, blank=True)
    birthday = models.DateField(
        blank=True, null=True,
        help_text='Used for birthday notifications to other family members'
    )

    # Preferences
    preferred_language = models.CharField(
        max_length=10, choices=LANGUAGE_CHOICES, default='en'
    )
    timezone = models.CharField(
        max_length=50, default='UTC',
        help_text='IANA timezone string, e.g. America/New_York'
    )
    theme_preference = models.CharField(
        max_length=10, choices=THEME_CHOICES, default='system'
    )

    # Link to the FamilyMember record this user "is"
    linked_member = models.OneToOneField(
        'tree.FamilyMember',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='claimed_by_profile',
        help_text='The family member record this account belongs to'
    )

    # Account verification
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    phone = models.CharField(max_length=30, blank=True)

    # Smart Notification preferences:
    # Critical actionable items (change approvals, invitations) default to True.
    # Casual/social updates (birthdays, photo tags, new member additions) default to False for email (In-App only).
    notify_invitations_email = models.BooleanField(
        default=True,
        help_text='Receive emails when invited to join a family tree'
    )
    notify_change_requests_email = models.BooleanField(
        default=True,
        help_text='Receive emails for pending change requests needing your approval'
    )
    notify_birthdays_email = models.BooleanField(
        default=False,
        help_text='Receive emails for family birthdays (In-App notification always active)'
    )
    notify_birthdays_push = models.BooleanField(default=True)
    notify_new_member_email = models.BooleanField(
        default=False,
        help_text='Receive emails when new members are added'
    )
    notify_photo_tags_email = models.BooleanField(
        default=False,
        help_text='Receive emails when tagged in a photo'
    )
    digest_frequency = models.CharField(
        max_length=10, choices=DIGEST_CHOICES, default='instant'
    )

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return self.display_name or self.nickname or self.user.username

    @property
    def full_name(self):
        return self.user.get_full_name() or self.display_name or self.user.username

    class Meta:
        verbose_name = 'User Profile'


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a UserProfile for every new user."""
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Ensure the profile is saved when the user is saved."""
    if hasattr(instance, 'profile'):
        instance.profile.save()
