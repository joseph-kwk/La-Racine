"""
notifications/management/commands/send_birthday_notifications.py

Command to generate birthday notifications for family members whose birthday is today.
Updated to match current Notification schema fields.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from tree.models import FamilyMember
from notifications.models import Notification


class Command(BaseCommand):
    help = 'Send birthday notifications for family members whose birthday is today'

    def handle(self, *args, **options):
        today = timezone.now().date()

        # Find members born today (month & day match)
        birthday_members = FamilyMember.objects.filter(
            birth_date__date__month=today.month,
            birth_date__date__day=today.day,
            is_alive=True,
        ).select_related('tree', 'tree__created_by', 'birth_date')

        notifications_created = 0

        for member in birthday_members:
            tree_owner = member.tree.created_by
            # Calculate age
            born_year = member.birth_date.date.year if member.birth_date and member.birth_date.date else None
            age_str = f" ({today.year - born_year} years old)" if born_year else ""

            # Check if notification already created today for this member
            existing = Notification.objects.filter(
                recipient=tree_owner,
                event_type='birthday',
                related_member=member,
                created_at__date=today,
            ).exists()

            if not existing:
                Notification.objects.create(
                    recipient=tree_owner,
                    event_type='birthday',
                    channel='in_app',
                    title=f'🎂 Birthday Today: {member.display_name}',
                    body=f'Today is {member.display_name}\'s birthday{age_str} in "{member.tree.name}".',
                    related_member=member,
                    related_tree=member.tree,
                    action_url=f'/members/{member.pk}',
                    status='sent',
                    sent_at=timezone.now(),
                )
                notifications_created += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created birthday notification for {member.display_name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Birthday notifications processed: {notifications_created}')
        )