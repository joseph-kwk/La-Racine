"""
notifications/models.py — Notification System

Multi-channel notification system supporting:
- In-app notifications (bell icon)
- Email delivery
- Push notifications (future)

Events covered:
- Birthdays, deaths, new member added
- Change request lifecycle (submitted, approved, rejected)
- Photo tags
- Tree invitations
- Announcements
"""

from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    Represents a single notification sent to a user.
    Each delivery channel (in-app, email, push) gets its own record
    so delivery status can be tracked independently.
    """

    EVENT_TYPES = [
        # Member lifecycle
        ('birthday',           '🎂 Birthday'),
        ('death_recorded',     '⚰️ Death Recorded'),
        ('new_member',         '👶 New Member Added'),
        # Change management
        ('change_submitted',   '📝 Change Request Submitted'),
        ('change_approved',    '✅ Change Request Approved'),
        ('change_rejected',    '❌ Change Request Rejected'),
        ('change_needs_review','👀 Change Needs Your Review'),
        # Media
        ('photo_uploaded',     '🖼️ New Photo Uploaded'),
        ('photo_tagged',       '🏷️ You Were Tagged in a Photo'),
        # Social
        ('family_update',      '📣 Family Announcement'),
        ('comment_on_update',  '💬 Comment on Update'),
        # Access & invitations
        ('tree_invitation',    '🔗 Invited to Join Tree'),
        ('invitation_accepted','🤝 Invitation Accepted'),
        ('member_claimed',     '🔑 Member Profile Claimed'),
        # System
        ('system',             '⚙️ System Message'),
    ]

    CHANNEL_CHOICES = [
        ('in_app', 'In-App'),
        ('email',  'Email'),
        ('push',   'Push'),
    ]

    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('sent',      'Sent'),
        ('delivered', 'Delivered'),
        ('failed',    'Failed'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    channel = models.CharField(
        max_length=10, choices=CHANNEL_CHOICES, default='in_app'
    )

    # Notification content
    title = models.CharField(max_length=255, blank=True, default='')
    body = models.TextField(blank=True, default='')

    # Generic relations to the triggering objects
    related_member = models.ForeignKey(
        'tree.FamilyMember',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='notifications'
    )
    related_tree = models.ForeignKey(
        'tree.Tree',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='notifications'
    )
    related_change_request = models.ForeignKey(
        'tree.ChangeRequest',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='notifications'
    )
    # URL to navigate to when notification is clicked
    action_url = models.CharField(max_length=500, blank=True)

    # State
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Delivery tracking
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='pending'
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['event_type', 'status']),
        ]

    def __str__(self):
        return f'[{self.channel}] {self.event_type} → {self.recipient.username}: {self.title}'

    def mark_read(self):
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class NotificationBatch(models.Model):
    """
    Groups multiple notifications into a single digest email.
    Used when digest_frequency is 'daily' or 'weekly'.
    """
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_batches'
    )
    notifications = models.ManyToManyField(Notification, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    is_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Batch for {self.recipient.username} — {self.created_at.date()}'

    class Meta:
        verbose_name = 'Notification Batch'
        ordering = ['-created_at']
