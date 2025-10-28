from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from tree.models import FamilyMember
from .models import Notification

@receiver(pre_save, sender=FamilyMember)
def store_old_values(sender, instance, **kwargs):
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
    if created:
        # Create addition notification for tree owner
        Notification.objects.create(
            type='Addition',
            target_user=instance.tree.created_by,
            event_date=timezone.now().date(),
            related_member=instance
        )
    else:
        # Check for death
        if hasattr(instance, '_old_is_alive') and instance._old_is_alive and not instance.is_alive:
            Notification.objects.create(
                type='Death',
                target_user=instance.tree.created_by,
                event_date=timezone.now().date(),
                related_member=instance
            )