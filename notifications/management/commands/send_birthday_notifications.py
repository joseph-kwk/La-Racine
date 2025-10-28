from django.core.management.base import BaseCommand
from django.utils import timezone
from tree.models import FamilyMember
from notifications.models import Notification

class Command(BaseCommand):
    help = 'Send birthday notifications for family members whose birthday is today'

    def handle(self, *args, **options):
        today = timezone.now().date()
        current_year = today.year

        # Find members with birthday today
        birthday_members = FamilyMember.objects.filter(
            birth_date__month=today.month,
            birth_date__day=today.day
        )

        notifications_created = 0

        for member in birthday_members:
            # Check if notification already exists for this year
            existing = Notification.objects.filter(
                type='Birthday',
                related_member=member,
                event_date__year=current_year
            ).exists()

            if not existing:
                Notification.objects.create(
                    type='Birthday',
                    target_user=member.tree.created_by,
                    event_date=today,
                    related_member=member
                )
                notifications_created += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created birthday notification for {member.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Birthday notifications sent: {notifications_created}')
        )