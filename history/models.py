"""
history/models.py — Life Events & Timeline

Records significant life events for family members, forming
the personal timeline that appears on each member's profile page.

Events include milestones (birth, marriage, graduation, etc.),
medical history (optional, private), and family events (reunions, etc.).
"""

from django.db import models
from django.conf import settings


class LifeEvent(models.Model):
    """
    A significant event in a family member's life.
    Forms the timeline view on the member's profile page.
    """

    EVENT_TYPES = [
        # Major milestones
        ('birth',        '🍼 Birth'),
        ('baptism',      '⛪ Baptism / Naming Ceremony'),
        ('childhood',    '👦 Childhood'),
        ('education',    '🎓 Education'),
        ('graduation',   '🎓 Graduation'),
        ('career',       '💼 Career'),
        ('military',     '🎖️ Military Service'),
        # Relationships
        ('marriage',     '💍 Marriage'),
        ('divorce',      '📄 Divorce / Separation'),
        ('engagement',   '💎 Engagement'),
        # Family
        ('child_born',   '👶 Child Born'),
        ('adoption',     '🏠 Adoption'),
        # Residence
        ('moved',        '📍 Moved / Relocated'),
        ('emigrated',    '✈️ Emigrated'),
        ('immigrated',   '🛬 Immigrated'),
        # Achievements
        ('award',        '🏆 Award / Honor'),
        ('publication',  '📚 Publication'),
        ('founded',      '🏗️ Founded Organization'),
        # Health (private by default)
        ('illness',      '🏥 Illness'),
        ('recovery',     '💪 Recovery'),
        # Religion / culture
        ('religious',    '🕌 Religious Milestone'),
        ('cultural',     '🎭 Cultural Milestone'),
        # End of life
        ('retirement',   '🌅 Retirement'),
        ('death',        '⚰️ Death'),
        ('memorial',     '🕯️ Memorial'),
        # Generic
        ('other',        '📌 Other'),
    ]

    PRIVACY_LEVELS = [
        ('public',       'Public'),
        ('family',       'Family Only'),
        ('close_family', 'Close Family'),
        ('private',      'Private'),
    ]

    member = models.ForeignKey(
        'tree.FamilyMember',
        on_delete=models.CASCADE,
        related_name='life_events'
    )

    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    title = models.CharField(
        max_length=255,
        help_text='Short event title, e.g. "Graduated from University of Kinshasa"'
    )
    description = models.TextField(blank=True)

    # Date — can be fuzzy for historical events
    date = models.DateField(null=True, blank=True)
    date_is_approximate = models.BooleanField(
        default=False,
        help_text='If true, date is approximate (circa)'
    )
    date_display = models.CharField(
        max_length=100, blank=True,
        help_text='Custom date display, e.g. "Spring 1945"'
    )

    # End date (for events with duration)
    end_date = models.DateField(null=True, blank=True)

    # Location
    location = models.CharField(max_length=255, blank=True)
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)

    # Media attachment
    photo = models.ImageField(
        upload_to='life_events/', blank=True, null=True
    )
    document = models.FileField(
        upload_to='life_events/docs/', blank=True, null=True
    )

    # Privacy
    privacy_level = models.CharField(
        max_length=20, choices=PRIVACY_LEVELS, default='family'
    )

    # Provenance
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'created_at']
        verbose_name = 'Life Event'
        indexes = [
            models.Index(fields=['member', 'date']),
            models.Index(fields=['event_type']),
        ]

    def __str__(self):
        date_str = self.date_display or (
            str(self.date) if self.date else 'Unknown date'
        )
        return f'{self.get_event_type_display()} — {self.member.display_name} ({date_str})'


class AuditLog(models.Model):
    """
    Immutable audit trail: records who changed what and when.
    Used for transparency and dispute resolution in change governance.
    """

    ACTION_TYPES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('approve', 'Approved'),
        ('reject', 'Rejected'),
        ('invite', 'Invited'),
        ('login', 'Logged In'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_TYPES)

    # What was affected
    model_name = models.CharField(max_length=100)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    object_repr = models.CharField(max_length=500, blank=True)

    # Snapshot of changes
    changes = models.JSONField(
        null=True, blank=True,
        help_text='JSON diff of before/after values'
    )

    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['user', '-timestamp']),
        ]

    def __str__(self):
        return f'{self.user} {self.action} {self.model_name}:{self.object_id} at {self.timestamp}'


# Backward compatibility alias
class HistoryEvent(models.Model):
    """
    Legacy model — superseded by LifeEvent.
    Kept for migration compatibility.
    """
    member = models.ForeignKey(
        'tree.FamilyMember',
        on_delete=models.CASCADE,
        related_name='history_events'
    )
    event_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    date = models.DateField()

    def __str__(self):
        return f'{self.event_type} for {self.member.name} on {self.date}'

    class Meta:
        verbose_name = 'History Event (Legacy)'
