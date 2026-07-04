"""
core/serializers.py — Serializers for user accounts and profiles
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'date_joined')
        read_only_fields = ('id', 'date_joined')


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.ReadOnlyField()
    linked_member_id = serializers.PrimaryKeyRelatedField(
        source='linked_member',
        read_only=True
    )

    class Meta:
        model = UserProfile
        fields = (
            'id', 'user', 'display_name', 'nickname', 'profile_photo', 'bio',
            'current_location', 'birthday', 'preferred_language', 'timezone',
            'theme_preference', 'linked_member_id', 'full_name',
            'is_email_verified', 'is_phone_verified',
            'notify_birthdays_email', 'notify_birthdays_push',
            'notify_new_member_email', 'notify_change_requests_email',
            'notify_photo_tags_email', 'notify_invitations_email',
            'digest_frequency', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'user', 'is_email_verified', 'is_phone_verified', 'created_at', 'updated_at')
