from django.db import models
from django.conf import settings
from tree.models import FamilyMember

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('Birthday', 'Birthday'),
        ('Death', 'Death'),
        ('Addition', 'Addition'),
    ]
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    target_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    event_date = models.DateField()
    related_member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} for {self.related_member.name} to {self.target_user.username}"
