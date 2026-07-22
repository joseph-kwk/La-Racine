"""
notifications/signals.py — Auto-create notifications on model events

Covers:
- FamilyMember creation & death recording
- PhotoTag (tagged member receives notification if they have an account)
- UpdateComment (author of post receives notification when someone comments)
"""

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from tree.models import FamilyMember, PhotoTag, UpdateComment
from .models import Notification


@receiver(pre_save, sender=FamilyMember)
def store_old_values(sender, instance, **kwargs):
    """Cache the pre-save is_alive value so we can detect death recording."""
    if instance.pk:
        try:
            old_instance = FamilyMember.objects.get(pk=instance.pk)
            instance._old_is_alive = old_instance.is_alive
        except FamilyMember.DoesNotExist:
            instance._old_is_alive = True
    else:
        instance._old_is_alive = None


@receiver(post_save, sender=FamilyMember)
def create_member_notifications(sender, instance, created, **kwargs):
    """
    Fire in-app notifications to the tree owner when a member is added
    or when a death is recorded for a previously living member.
    """
    tree_owner = instance.tree.created_by

    if created:
        # Don't notify if the creator is the owner themselves
        if instance.added_by != tree_owner:
            Notification.objects.create(
                recipient=tree_owner,
                event_type='new_member',
                channel='in_app',
                title='👶 New member added',
                body=f'{instance.display_name} has been added to "{instance.tree.name}".',
                related_member=instance,
                related_tree=instance.tree,
                action_url=f'/members/{instance.pk}',
                status='sent',
                sent_at=timezone.now(),
            )
    else:
        # Detect: was alive before save, now marked deceased
        was_alive = getattr(instance, '_old_is_alive', True)
        if was_alive and not instance.is_alive:
            Notification.objects.create(
                recipient=tree_owner,
                event_type='death_recorded',
                channel='in_app',
                title='⚰️ Death recorded',
                body=f'A death has been recorded for {instance.display_name} in "{instance.tree.name}".',
                related_member=instance,
                related_tree=instance.tree,
                action_url=f'/members/{instance.pk}',
                status='sent',
                sent_at=timezone.now(),
            )


@receiver(post_save, sender=PhotoTag)
def create_photo_tag_notification(sender, instance, created, **kwargs):
    """Notify a tagged member if they have an active user account."""
    if created and instance.member.user_account and instance.member.user_account != instance.tagged_by:
        Notification.objects.create(
            recipient=instance.member.user_account,
            event_type='photo_tagged',
            channel='in_app',
            title='🏷️ You were tagged in a photo',
            body=f'{instance.tagged_by.username} tagged you in a family photo.',
            related_member=instance.member,
            related_tree=instance.photo.tree,
            action_url=f'/photos/{instance.photo.pk}',
            status='sent',
            sent_at=timezone.now(),
        )


@receiver(post_save, sender=UpdateComment)
def create_comment_notification(sender, instance, created, **kwargs):
    """Notify update author when someone comments on their post."""
    post_author = instance.update.created_by
    if created and post_author != instance.author:
        Notification.objects.create(
            recipient=post_author,
            event_type='comment_on_update',
            channel='in_app',
            title='💬 New comment on your update',
            body=f'{instance.author.username} commented on "{instance.update.title}".',
            related_tree=instance.update.tree,
            action_url=f'/updates/{instance.update.pk}',
            status='sent',
            sent_at=timezone.now(),
        )