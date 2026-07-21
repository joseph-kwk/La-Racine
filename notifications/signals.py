"""
notifications/signals.py — Auto-create notifications on FamilyMember lifecycle events.

Fixed to use the current Notification model schema:
  - event_type (not type)
  - recipient (not target_user)
  - channel, title, body, status, sent_at (required fields)
  - removed event_date (not a model field)
"""

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from tree.models import FamilyMember
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
def create_notifications(sender, instance, created, **kwargs):
    """
    Fire in-app notifications to the tree owner when a member is added
    or when a death is recorded for a previously living member.
    """
    tree_owner = instance.tree.created_by

    if created:
        Notification.objects.create(
            recipient=tree_owner,
            event_type='new_member',
            channel='in_app',
            title='New member added',
            body=(
                f'{instance.display_name} has been added to '
                f'"{instance.tree.name}".'
            ),
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
                title='Death recorded',
                body=(
                    f'A death has been recorded for '
                    f'{instance.display_name} in "{instance.tree.name}".'
                ),
                related_member=instance,
                related_tree=instance.tree,
                action_url=f'/members/{instance.pk}',
                status='sent',
                sent_at=timezone.now(),
            )