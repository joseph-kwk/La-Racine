from django.db import models
from tree.models import FamilyMember

class HistoryEvent(models.Model):
    member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE, related_name='history_events')
    event_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    date = models.DateField()

    def __str__(self):
        return f"{self.event_type} for {self.member.name} on {self.date}"
