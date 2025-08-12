from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group

ROLES = [
    'Viewer',
    'Editor',
    'Admin',
]

class Command(BaseCommand):
    help = 'Create default roles (Viewer, Editor, Admin) as Django groups.'

    def handle(self, *args, **options):
        for role in ROLES:
            group, created = Group.objects.get_or_create(name=role)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created role: {role}'))
            else:
                self.stdout.write(f'Role already exists: {role}')
        self.stdout.write(self.style.SUCCESS('Roles seeded.'))
