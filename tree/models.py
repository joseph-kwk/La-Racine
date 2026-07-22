"""
tree/models.py — La Racine Family Tree Data Models

Core models for the family tree system including:
- FuzzyDate: handles approximate/partial/BCE dates
- Tree & TreePermission: tree containers and access control
- FamilyMember & FamilyRelationship: people and their connections
- ChangeRequest & ChangeRequestValidator: change governance workflow
- MemberPrivacySettings: field-level privacy controls
- FamilyPhoto & PhotoTag: media management
- FamilyUpdate, UpdateComment, UpdateLike: social feed
- TreeInvitation: invite-by-email flow
"""

import secrets
from django.db import models
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


# ---------------------------------------------------------------------------
# FuzzyDate — handles imprecise genealogical dates
# ---------------------------------------------------------------------------

class FuzzyDate(models.Model):
    """
    Represents a date with variable precision — critical for genealogy where
    exact dates are often unknown (e.g. 'circa 1920s', 'before 1960', 'unknown').
    """
    PRECISION_CHOICES = [
        ('exact',       'Exact date'),
        ('month_year',  'Month & Year only'),
        ('year',        'Year only'),
        ('decade',      'Decade (e.g. 1940s)'),
        ('approximate', 'Approximate (~)'),
        ('before',      'Before a date'),
        ('after',       'After a date'),
        ('unknown',     'Unknown'),
    ]

    # The best known date (null if truly unknown)
    date = models.DateField(null=True, blank=True)
    precision = models.CharField(
        max_length=20, choices=PRECISION_CHOICES, default='exact'
    )
    # For historical/ancient dates before year 1 CE
    bce = models.BooleanField(default=False, verbose_name='Before Common Era')
    # Human-readable override: "circa 1920s", "early 1800s"
    display_text = models.CharField(
        max_length=100, blank=True,
        help_text='Optional custom display text, e.g. "circa 1920s"'
    )

    def __str__(self):
        if self.display_text:
            return self.display_text
        if self.precision == 'unknown' or self.date is None:
            return 'Unknown'
        suffix = ' BCE' if self.bce else ''
        if self.precision == 'exact':
            return self.date.strftime('%B %d, %Y') + suffix
        if self.precision == 'month_year':
            return self.date.strftime('%B %Y') + suffix
        if self.precision == 'year':
            return str(self.date.year) + suffix
        if self.precision == 'decade':
            return f"{(self.date.year // 10) * 10}s{suffix}"
        if self.precision == 'approximate':
            return f"~{self.date.year}{suffix}"
        if self.precision == 'before':
            return f"Before {self.date.year}{suffix}"
        if self.precision == 'after':
            return f"After {self.date.year}{suffix}"
        return str(self.date) + suffix

    class Meta:
        verbose_name = 'Fuzzy Date'


# ---------------------------------------------------------------------------
# Tree & TreePermission
# ---------------------------------------------------------------------------

class Tree(models.Model):
    TREE_TYPE_CHOICES = [
        ('primary',  'Primary Family'),
        ('maternal', 'Maternal Line'),
        ('paternal', 'Paternal Line'),
        ('extended', 'Extended Family'),
        ('adopted',  'Adopted Family'),
        ('step',     'Step Family'),
        ('other',    'Other'),
    ]

    PRIVACY_LEVEL_CHOICES = [
        ('public',  'Public — anyone can view'),
        ('shared',  'Shared — only invited members'),
        ('private', 'Private — invite only'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(
        blank=True, help_text='A brief description of this family tree'
    )
    tree_type = models.CharField(
        max_length=20, choices=TREE_TYPE_CHOICES, default='primary'
    )
    privacy_level = models.CharField(
        max_length=20, choices=PRIVACY_LEVEL_CHOICES, default='private'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_trees'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Governance settings
    require_approval_for_edits = models.BooleanField(
        default=True,
        help_text='If true, all member edits go through change request approval'
    )
    allow_member_invites = models.BooleanField(
        default=True,
        help_text='Allow editors to invite new members to the tree'
    )

    # Primary language of this tree's data
    primary_language = models.CharField(
        max_length=10, default='en',
        help_text='BCP 47 language tag for the primary data language'
    )

    # ── Family Identity: Theme & Crest ───────────────────────────────────────
    theme_preset = models.CharField(
        max_length=60, default='emerald_root', blank=True,
        help_text='Slug of the chosen preset palette (e.g. "savanna_gold")'
    )
    theme_primary = models.CharField(
        max_length=7, blank=True,
        help_text='Primary hex color, e.g. #15803d'
    )
    theme_mid = models.CharField(
        max_length=7, blank=True,
        help_text='Mid-tone hex color for gradients'
    )
    theme_light = models.CharField(
        max_length=7, blank=True,
        help_text='Light/background hex color'
    )
    theme_dark = models.CharField(
        max_length=7, blank=True,
        help_text='Dark hex color for text-on-light use'
    )
    crest_image = models.ImageField(
        upload_to='crests/', blank=True, null=True,
        help_text='Family crest, coat of arms, or clan emblem (max 2MB)'
    )
    crest_caption = models.CharField(
        max_length=255, blank=True,
        help_text='Optional family motto or crest description'
    )

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class TreePermission(models.Model):
    ROLE_CHOICES = [
        ('owner',     'Owner — full control'),
        ('validator', 'Validator — can approve/reject change requests'),
        ('editor',    'Editor — can add/edit members'),
        ('viewer',    'Viewer — read-only access'),
        ('guest',     'Guest — limited view'),
    ]

    STATUS_CHOICES = [
        ('active',   'Active'),
        ('pending',  'Pending invitation'),
        ('invited',  'Invited'),
        ('rejected', 'Rejected'),
        ('revoked',  'Revoked'),
    ]

    tree = models.ForeignKey(
        Tree, on_delete=models.CASCADE, related_name='permissions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tree_permissions'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='sent_invitations'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tree', 'user')
        verbose_name = 'Tree Permission'

    def __str__(self):
        return f'{self.user.username} — {self.tree.name} ({self.role})'


# ---------------------------------------------------------------------------
# FamilyMember
# ---------------------------------------------------------------------------

class FamilyMember(models.Model):
    GENDER_CHOICES = [
        ('male',              'Male'),
        ('female',            'Female'),
        ('non_binary',        'Non-binary'),
        ('other',             'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]

    PRIVACY_LEVELS = [
        ('public',       'Public'),
        ('family',       'Family Only'),
        ('close_family', 'Close Family'),
        ('private',      'Private'),
    ]

    tree = models.ForeignKey(
        Tree, on_delete=models.CASCADE, related_name='members'
    )

    # Name fields
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    maiden_name = models.CharField(
        max_length=255, blank=True,
        help_text='Birth surname before marriage'
    )
    nickname = models.CharField(max_length=100, blank=True)
    preferred_name = models.CharField(
        max_length=255, blank=True,
        help_text='Name this person preferred to be called'
    )

    gender = models.CharField(
        max_length=20, choices=GENDER_CHOICES, blank=True
    )

    # Dates using FuzzyDate for genealogical precision
    birth_date = models.ForeignKey(
        FuzzyDate,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='member_births',
        verbose_name='Date of Birth'
    )
    death_date = models.ForeignKey(
        FuzzyDate,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='member_deaths',
        verbose_name='Date of Death'
    )

    # Location information
    birth_location = models.CharField(max_length=255, blank=True)
    birth_lat = models.FloatField(null=True, blank=True)
    birth_lng = models.FloatField(null=True, blank=True)
    current_location = models.CharField(max_length=255, blank=True)
    death_location = models.CharField(max_length=255, blank=True)

    # Personal details
    occupation = models.CharField(max_length=255, blank=True)
    education = models.TextField(blank=True)
    biography = models.TextField(blank=True)
    notes = models.TextField(
        blank=True,
        help_text='Internal notes visible only to editors/owners'
    )
    nationality = models.CharField(max_length=100, blank=True)
    ethnicity = models.CharField(max_length=100, blank=True)
    religion = models.CharField(max_length=100, blank=True)

    # Media
    photo = models.ImageField(upload_to='members/', blank=True, null=True)

    # Privacy
    privacy_level = models.CharField(
        max_length=20, choices=PRIVACY_LEVELS, default='family'
    )

    # Consent for living individuals (GDPR / global privacy law)
    requires_consent = models.BooleanField(
        default=True,
        help_text='Living people require explicit consent to publish their data'
    )
    consent_given = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)

    # Link to a real user account if this member uses the platform
    user_account = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='family_member_profile',
        help_text='If this person has a La Racine account'
    )

    # Provenance
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='added_members'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Legacy simple fields kept for backward compatibility
    relationship = models.CharField(max_length=100, blank=True)
    is_alive = models.BooleanField(default=True)

    # Display preferences — controlled by the tree owner
    show_age = models.BooleanField(
        default=True,
        help_text='Whether to show calculated age on this member\'s profile'
    )

    @property
    def full_name(self):
        parts = [self.first_name]
        if self.maiden_name and self.maiden_name != self.last_name:
            parts.append(self.maiden_name)
        parts.append(self.last_name)
        return ' '.join(p for p in parts if p)

    @property
    def display_name(self):
        name = self.preferred_name or self.first_name
        if self.nickname:
            return f"{name} '{self.nickname}' {self.last_name}"
        return f"{name} {self.last_name}"

    @property
    def name(self):
        """Backward-compatible alias for full_name."""
        return self.full_name

    @property
    def deceased(self):
        return self.death_date is not None

    @property
    def age(self):
        """
        Returns (age_years, is_exact) where is_exact=False for year-only dates.
        Returns None if birth date is unknown or precision is 'estimate'.
        """
        from datetime import date
        bd = self.birth_date
        if not bd or not bd.date:
            return None
        try:
            born = bd.date
            if bd.bce:
                return None  # BCE dates — no age calculation
            today = date.today()
            end = self.death_date.date if self.death_date and self.death_date.date else today
            delta_years = end.year - born.year - (
                (end.month, end.day) < (born.month, born.day)
            )
            is_exact = (bd.precision == 'exact')
            return (max(0, delta_years), is_exact)
        except Exception:
            return None

    def __str__(self):
        return self.display_name

    class Meta:
        ordering = ['last_name', 'first_name']


# ---------------------------------------------------------------------------
# FamilyRelationship — proper graph of who is related to whom
# ---------------------------------------------------------------------------

class FamilyRelationship(models.Model):
    RELATIONSHIP_TYPES = [
        # Core biological/legal
        ('parent',          'Parent'),
        ('child',           'Child'),
        ('spouse',          'Spouse'),
        ('partner',         'Life Partner'),
        # Siblings
        ('sibling',         'Sibling'),
        ('half_sibling',    'Half Sibling'),
        ('step_sibling',    'Step Sibling'),
        # Extended
        ('grandparent',     'Grandparent'),
        ('grandchild',      'Grandchild'),
        ('aunt_uncle',      'Aunt / Uncle'),
        ('niece_nephew',    'Niece / Nephew'),
        ('cousin',          'Cousin'),
        # Step / adoptive
        ('step_parent',     'Step Parent'),
        ('step_child',      'Step Child'),
        ('adoptive_parent', 'Adoptive Parent'),
        ('adopted_child',   'Adopted Child'),
        ('foster_parent',   'Foster Parent'),
        ('foster_child',    'Foster Child'),
        # In-laws
        ('parent_in_law',   'Parent-in-law'),
        ('child_in_law',    'Child-in-law'),
        ('sibling_in_law',  'Sibling-in-law'),
        # Other
        ('godparent',       'Godparent'),
        ('godchild',        'Godchild'),
        ('guardian',        'Guardian'),
        ('ward',            'Ward'),
    ]

    from_member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name='relationships_from'
    )
    to_member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name='relationships_to'
    )
    relationship_type = models.CharField(
        max_length=20, choices=RELATIONSHIP_TYPES
    )

    # Timeline
    start_date = models.DateField(
        null=True, blank=True,
        help_text='When relationship began (e.g. marriage date)'
    )
    end_date = models.DateField(
        null=True, blank=True,
        help_text='When relationship ended (e.g. divorce, death)'
    )

    is_biological = models.BooleanField(default=True)
    is_current = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['from_member', 'to_member', 'relationship_type']
        verbose_name = 'Family Relationship'

    def __str__(self):
        return (
            f'{self.from_member.display_name} is '
            f'{self.get_relationship_type_display().lower()} of '
            f'{self.to_member.display_name}'
        )


# ---------------------------------------------------------------------------
# MemberPrivacySettings — field-level privacy per member
# ---------------------------------------------------------------------------

class MemberPrivacySettings(models.Model):
    PRIVACY_LEVELS = [
        ('public',       'Public'),
        ('family',       'Family Only'),
        ('close_family', 'Close Family'),
        ('private',      'Private'),
    ]

    member = models.OneToOneField(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name='privacy_settings'
    )

    basic_info_level   = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    birth_date_level   = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    death_date_level   = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    location_level     = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='close_family')
    contact_info_level = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='private')
    photos_level       = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    biography_level    = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    notes_level        = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='private')

    allow_photo_tagging    = models.BooleanField(default=True)
    allow_story_sharing    = models.BooleanField(default=True)
    allow_contact_sharing  = models.BooleanField(default=False)

    notify_on_updates          = models.BooleanField(default=True)
    notify_on_photo_tags       = models.BooleanField(default=True)
    notify_on_new_relationships = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Privacy settings for {self.member.display_name}'

    class Meta:
        verbose_name = 'Member Privacy Settings'


# ---------------------------------------------------------------------------
# ChangeRequest — change governance workflow
# ---------------------------------------------------------------------------

class ChangeRequest(models.Model):
    """
    Tracks proposed changes to a FamilyMember's data.
    Changes go through an approval workflow instead of being applied directly,
    ensuring data integrity and family consensus.
    """
    STATUS_CHOICES = [
        ('pending',       'Pending Review'),
        ('approved',      'Approved'),
        ('rejected',      'Rejected'),
        ('auto_approved', 'Auto-Approved'),
        ('withdrawn',     'Withdrawn'),
    ]

    FIELD_CATEGORY_CHOICES = [
        ('critical',  'Critical — birth/death dates, parents'),
        ('standard',  'Standard — name, bio, occupation'),
        ('media',     'Media — photos, documents'),
        ('basic',     'Basic — location, nickname'),
    ]

    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name='change_requests'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submitted_change_requests'
    )

    # What changed
    field_name = models.CharField(
        max_length=100,
        help_text='The model field being changed, e.g. "birth_date", "biography"'
    )
    field_category = models.CharField(
        max_length=20, choices=FIELD_CATEGORY_CHOICES, default='standard'
    )
    old_value = models.JSONField(
        null=True, blank=True,
        help_text='Previous value (serialized)'
    )
    new_value = models.JSONField(
        help_text='Proposed new value (serialized)'
    )
    reason = models.TextField(
        blank=True,
        help_text='Why is this change being proposed?'
    )

    # Review
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_change_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(
        blank=True,
        help_text='Notes from the reviewer explaining approval/rejection'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Change Request'

    def __str__(self):
        return (
            f'Change to {self.field_name} of {self.member.display_name} '
            f'by {self.requested_by.username} [{self.status}]'
        )


class ChangeRequestValidator(models.Model):
    """
    Designates which users can approve/reject change requests for a specific
    family member. These are the 'family validators' — trusted elders or
    designated data stewards.
    """
    member = models.ForeignKey(
        FamilyMember,
        on_delete=models.CASCADE,
        related_name='validators'
    )
    validator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='validates_members'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_validators'
    )

    # Scope of validation authority
    can_approve_critical = models.BooleanField(
        default=False,
        help_text='Can approve changes to birth/death dates, parents'
    )
    can_approve_standard = models.BooleanField(
        default=True,
        help_text='Can approve changes to name, bio, occupation'
    )
    can_approve_media = models.BooleanField(
        default=True,
        help_text='Can approve photo and document changes'
    )
    can_approve_basic = models.BooleanField(
        default=True,
        help_text='Can approve location, nickname changes'
    )

    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['member', 'validator']
        verbose_name = 'Change Request Validator'

    def __str__(self):
        return f'{self.validator.username} validates {self.member.display_name}'


# ---------------------------------------------------------------------------
# FamilyPhoto & PhotoTag
# ---------------------------------------------------------------------------

class FamilyPhoto(models.Model):
    PRIVACY_LEVELS = MemberPrivacySettings.PRIVACY_LEVELS

    tree = models.ForeignKey(
        Tree, on_delete=models.CASCADE, related_name='photos'
    )
    image = models.ImageField(upload_to='family_photos/')
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)

    date_taken = models.DateField(null=True, blank=True)
    location_taken = models.CharField(max_length=255, blank=True)

    tagged_members = models.ManyToManyField(
        FamilyMember, through='PhotoTag', blank=True
    )
    privacy_level = models.CharField(
        max_length=20, choices=PRIVACY_LEVELS, default='family'
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f'Photo uploaded on {self.uploaded_at.date()}'

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Family Photo'


class PhotoTag(models.Model):
    photo = models.ForeignKey(
        FamilyPhoto, on_delete=models.CASCADE, related_name='tags'
    )
    member = models.ForeignKey(
        FamilyMember, on_delete=models.CASCADE, related_name='photo_tags'
    )
    x_coordinate = models.FloatField(
        help_text='X position as percentage (0-100) of image width'
    )
    y_coordinate = models.FloatField(
        help_text='Y position as percentage (0-100) of image height'
    )
    tagged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    tagged_at = models.DateTimeField(auto_now_add=True)
    confirmed = models.BooleanField(
        default=False,
        help_text='Has the tagged person confirmed this tag?'
    )

    class Meta:
        unique_together = ['photo', 'member']
        verbose_name = 'Photo Tag'

    def __str__(self):
        return f'{self.member.display_name} tagged in {self.photo}'


# ---------------------------------------------------------------------------
# FamilyUpdate (social feed) + comments + likes
# ---------------------------------------------------------------------------

class FamilyUpdate(models.Model):
    UPDATE_TYPES = [
        ('news',         'Family News'),
        ('milestone',    'Milestone'),
        ('memorial',     'Memorial'),
        ('photo',        'Photo Share'),
        ('document',     'Document Share'),
        ('story',        'Family Story'),
        ('announcement', 'Announcement'),
    ]

    tree = models.ForeignKey(
        Tree, on_delete=models.CASCADE, related_name='updates'
    )
    related_members = models.ManyToManyField(FamilyMember, blank=True)

    title = models.CharField(max_length=255)
    content = models.TextField()
    update_type = models.CharField(
        max_length=20, choices=UPDATE_TYPES, default='news'
    )

    featured_image = models.ImageField(
        upload_to='updates/images/', blank=True, null=True
    )
    document = models.FileField(
        upload_to='updates/documents/', blank=True, null=True
    )

    is_public = models.BooleanField(default=False)
    visible_to_guests = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Denormalized counts for performance
    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Family Update'

    def __str__(self):
        return f'{self.title} ({self.get_update_type_display()})'


class UpdateComment(models.Model):
    update = models.ForeignKey(
        FamilyUpdate, on_delete=models.CASCADE, related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Update Comment'

    def __str__(self):
        return f'Comment by {self.author.username} on "{self.update.title}"'


class UpdateLike(models.Model):
    update = models.ForeignKey(
        FamilyUpdate, on_delete=models.CASCADE, related_name='likes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['update', 'user']
        verbose_name = 'Update Like'

    def __str__(self):
        return f'{self.user.username} likes "{self.update.title}"'


# ---------------------------------------------------------------------------
# TreeInvitation — invite people by email
# ---------------------------------------------------------------------------

class TreeInvitation(models.Model):
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired',  'Expired'),
        ('revoked',  'Revoked'),
    ]

    tree = models.ForeignKey(
        Tree, on_delete=models.CASCADE, related_name='invitations'
    )
    invited_email = models.EmailField()
    invited_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(
        max_length=20,
        choices=TreePermission.ROLE_CHOICES,
        default='viewer'
    )

    # Optionally link to an existing family member record
    related_member = models.ForeignKey(
        FamilyMember,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        help_text='If this invitation is for an existing family member record'
    )

    invitation_message = models.TextField(blank=True)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='pending'
    )

    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)

    # Secure token for email link
    invitation_token = models.CharField(
        max_length=64, unique=True, blank=True
    )

    def save(self, *args, **kwargs):
        if not self.invitation_token:
            self.invitation_token = secrets.token_urlsafe(48)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Invitation to {self.invited_email} for {self.tree.name}'

    class Meta:
        verbose_name = 'Tree Invitation'


# ---------------------------------------------------------------------------
# Legacy Update model (kept for DB compatibility — superseded by FamilyUpdate)
# ---------------------------------------------------------------------------

class Update(models.Model):
    """
    Legacy simple update model. Kept for migration compatibility.
    New code should use FamilyUpdate instead.
    """
    member = models.ForeignKey(
        FamilyMember, on_delete=models.CASCADE, related_name='simple_updates'
    )
    content = models.TextField()
    media = models.ImageField(upload_to='updates/', blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Update for {self.member.name} at {self.timestamp}'


# ---------------------------------------------------------------------------
# FamilyEvent & CalendarFeedToken — In-App Calendar & External iCal Sync
# ---------------------------------------------------------------------------

class FamilyEvent(models.Model):
    """Custom family events (Reunions, Gatherings, Ceremonies, Memorials)."""
    EVENT_TYPES = [
        ('reunion',   'Family Reunion'),
        ('gathering', 'Family Gathering'),
        ('ceremony',  'Ceremony / Milestone'),
        ('memorial',  'Memorial Service'),
        ('other',     'Other Event'),
    ]

    tree = models.ForeignKey(
        'Tree', on_delete=models.CASCADE, related_name='family_events'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='reunion')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    is_annual_recurring = models.BooleanField(
        default=False,
        help_text='If True, repeats annually on the same month & day'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_family_events'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.tree.name})"

    class Meta:
        ordering = ['start_date']


class CalendarFeedToken(models.Model):
    """Token for secure webcal/ics subscription feed endpoints."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='calendar_tokens'
    )
    tree = models.ForeignKey(
        'Tree', on_delete=models.CASCADE, related_name='calendar_tokens'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def get_or_create_token(cls, user, tree):
        tok_obj = cls.objects.filter(user=user, tree=tree).first()
        if not tok_obj:
            new_token = secrets.token_urlsafe(32)
            tok_obj = cls.objects.create(user=user, tree=tree, token=new_token)
        return tok_obj

    def __str__(self):
        return f"Token for {self.user.username} on {self.tree.name}"


# ---------------------------------------------------------------------------
# Signals — auto-create related objects on new FamilyMember
# ---------------------------------------------------------------------------

@receiver(post_save, sender=FamilyMember)
def create_member_privacy_settings(sender, instance, created, **kwargs):
    """Automatically create privacy settings for every new family member."""
    if created:
        MemberPrivacySettings.objects.get_or_create(member=instance)


@receiver(post_save, sender=UpdateLike)
def update_likes_count(sender, instance, created, **kwargs):
    if created:
        instance.update.likes_count = instance.update.likes.count()
        instance.update.save(update_fields=['likes_count'])


@receiver(post_delete, sender=UpdateLike)
def decrease_likes_count(sender, instance, **kwargs):
    instance.update.likes_count = instance.update.likes.count()
    instance.update.save(update_fields=['likes_count'])


@receiver(post_save, sender=UpdateComment)
def update_comments_count(sender, instance, created, **kwargs):
    if created:
        instance.update.comments_count = instance.update.comments.count()
        instance.update.save(update_fields=['comments_count'])


@receiver(post_delete, sender=UpdateComment)
def decrease_comments_count(sender, instance, **kwargs):
    instance.update.comments_count = instance.update.comments.count()
    instance.update.save(update_fields=['comments_count'])
