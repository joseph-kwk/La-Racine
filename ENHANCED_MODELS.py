# Enhanced Models for La Racine Family Tree System

from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

class Tree(models.Model):
    TREE_TYPES = [
        ('primary', 'Primary Family'),
        ('maternal', 'Maternal Line'),
        ('paternal', 'Paternal Line'),
        ('extended', 'Extended Family'),
        ('adopted', 'Adopted Family'),
        ('step', 'Step Family'),
    ]
    
    name = models.CharField(max_length=255)
    tree_type = models.CharField(max_length=20, choices=TREE_TYPES, default='primary')
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_public = models.BooleanField(default=False)
    allow_member_invites = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_tree_type_display()})"

class TreePermission(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('editor', 'Editor'),
        ('viewer', 'Viewer'),
        ('guest', 'Guest'),
    ]
    
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='permissions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='granted_permissions'
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['tree', 'user']
    
    def __str__(self):
        return f"{self.user.username} - {self.role} on {self.tree.name}"

class FamilyMember(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]
    
    PRIVACY_LEVELS = [
        ('public', 'Public'),
        ('family', 'Family Only'),
        ('close_family', 'Close Family'),
        ('private', 'Private'),
        ('deceased_public', 'Deceased Public'),
    ]
    
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='members')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    maiden_name = models.CharField(max_length=255, blank=True)
    nickname = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True)
    
    # Dates
    birth_date = models.DateField('Date of Birth', blank=True, null=True)
    death_date = models.DateField('Date of Death', blank=True, null=True)
    
    # Location information
    birth_location = models.CharField(max_length=255, blank=True)
    current_location = models.CharField(max_length=255, blank=True)
    death_location = models.CharField(max_length=255, blank=True)
    
    # Personal information
    occupation = models.CharField(max_length=255, blank=True)
    education = models.CharField(max_length=255, blank=True)
    biography = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    # Media
    profile_photo = models.ImageField(upload_to='members/photos/', blank=True, null=True)
    
    # Privacy and consent
    privacy_level = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    requires_consent = models.BooleanField(default=True)
    consent_given = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)
    
    # Platform connection
    user_account = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='family_member_profiles'
    )
    
    # Meta information
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='added_members'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def is_alive(self):
        return self.death_date is None
    
    @property
    def full_name(self):
        if self.maiden_name and self.last_name != self.maiden_name:
            return f"{self.first_name} {self.maiden_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"
    
    @property
    def display_name(self):
        if self.nickname:
            return f"{self.first_name} '{self.nickname}' {self.last_name}"
        return self.full_name
    
    def __str__(self):
        return self.display_name

class FamilyRelationship(models.Model):
    RELATIONSHIP_TYPES = [
        # Primary relationships
        ('parent', 'Parent'),
        ('child', 'Child'),
        ('spouse', 'Spouse'),
        ('partner', 'Life Partner'),
        
        # Sibling relationships
        ('sibling', 'Sibling'),
        ('half_sibling', 'Half Sibling'),
        ('step_sibling', 'Step Sibling'),
        
        # Extended family
        ('grandparent', 'Grandparent'),
        ('grandchild', 'Grandchild'),
        ('aunt_uncle', 'Aunt/Uncle'),
        ('niece_nephew', 'Niece/Nephew'),
        ('cousin', 'Cousin'),
        
        # Step and adoption
        ('step_parent', 'Step Parent'),
        ('step_child', 'Step Child'),
        ('adoptive_parent', 'Adoptive Parent'),
        ('adopted_child', 'Adopted Child'),
        ('foster_parent', 'Foster Parent'),
        ('foster_child', 'Foster Child'),
        
        # In-laws
        ('parent_in_law', 'Parent-in-law'),
        ('child_in_law', 'Child-in-law'),
        ('sibling_in_law', 'Sibling-in-law'),
        
        # Other
        ('godparent', 'Godparent'),
        ('godchild', 'Godchild'),
        ('guardian', 'Guardian'),
        ('ward', 'Ward'),
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
    relationship_type = models.CharField(max_length=20, choices=RELATIONSHIP_TYPES)
    
    # Relationship timeline
    start_date = models.DateField(null=True, blank=True, help_text="When relationship began")
    end_date = models.DateField(null=True, blank=True, help_text="When relationship ended")
    
    # Additional context
    notes = models.TextField(blank=True)
    is_biological = models.BooleanField(default=True)
    is_current = models.BooleanField(default=True)
    
    # Meta
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['from_member', 'to_member', 'relationship_type']
    
    def __str__(self):
        return f"{self.from_member.display_name} is {self.get_relationship_type_display().lower()} of {self.to_member.display_name}"

class MemberPrivacySettings(models.Model):
    PRIVACY_LEVELS = [
        ('public', 'Public'),
        ('family', 'Family Only'),
        ('close_family', 'Close Family'),
        ('private', 'Private'),
    ]
    
    member = models.OneToOneField(
        FamilyMember, 
        on_delete=models.CASCADE, 
        related_name='privacy_settings'
    )
    
    # Different privacy levels for different types of information
    basic_info_level = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    birth_date_level = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    location_level = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='close_family')
    contact_info_level = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='private')
    photos_level = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    biography_level = models.CharField(max_length=20, choices=PRIVACY_LEVELS, default='family')
    
    # Special permissions
    allow_photo_tagging = models.BooleanField(default=True)
    allow_story_sharing = models.BooleanField(default=True)
    allow_contact_sharing = models.BooleanField(default=False)
    
    # Notification preferences
    notify_on_updates = models.BooleanField(default=True)
    notify_on_photo_tags = models.BooleanField(default=True)
    notify_on_new_relationships = models.BooleanField(default=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Privacy settings for {self.member.display_name}"

class FamilyUpdate(models.Model):
    UPDATE_TYPES = [
        ('news', 'Family News'),
        ('milestone', 'Milestone'),
        ('memorial', 'Memorial'),
        ('photo', 'Photo Share'),
        ('document', 'Document Share'),
        ('story', 'Family Story'),
        ('announcement', 'Announcement'),
    ]
    
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='updates')
    related_members = models.ManyToManyField(FamilyMember, blank=True)
    
    title = models.CharField(max_length=255)
    content = models.TextField()
    update_type = models.CharField(max_length=20, choices=UPDATE_TYPES, default='news')
    
    # Media attachments
    featured_image = models.ImageField(upload_to='updates/images/', blank=True, null=True)
    document = models.FileField(upload_to='updates/documents/', blank=True, null=True)
    
    # Visibility
    is_public = models.BooleanField(default=False)
    visible_to_guests = models.BooleanField(default=False)
    
    # Meta
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Engagement
    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.get_update_type_display()}"

class UpdateComment(models.Model):
    update = models.ForeignKey(FamilyUpdate, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.update.title}"

class UpdateLike(models.Model):
    update = models.ForeignKey(FamilyUpdate, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['update', 'user']
    
    def __str__(self):
        return f"{self.user.username} likes {self.update.title}"

class FamilyPhoto(models.Model):
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='family_photos/')
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    
    # Photo metadata
    date_taken = models.DateField(null=True, blank=True)
    location_taken = models.CharField(max_length=255, blank=True)
    
    # Tagged members
    tagged_members = models.ManyToManyField(FamilyMember, through='PhotoTag', blank=True)
    
    # Privacy
    privacy_level = models.CharField(
        max_length=20, 
        choices=MemberPrivacySettings.PRIVACY_LEVELS, 
        default='family'
    )
    
    # Meta
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title or f"Photo uploaded on {self.uploaded_at.date()}"

class PhotoTag(models.Model):
    photo = models.ForeignKey(FamilyPhoto, on_delete=models.CASCADE)
    member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE)
    x_coordinate = models.FloatField(help_text="X position as percentage of image width")
    y_coordinate = models.FloatField(help_text="Y position as percentage of image height")
    
    tagged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tagged_at = models.DateTimeField(auto_now_add=True)
    confirmed = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['photo', 'member']
    
    def __str__(self):
        return f"{self.member.display_name} tagged in {self.photo.title or 'photo'}"

class TreeInvitation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]
    
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='invitations')
    invited_email = models.EmailField()
    invited_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=10, choices=TreePermission.ROLE_CHOICES, default='viewer')
    
    # Optional: connect to existing member
    related_member = models.ForeignKey(
        FamilyMember, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        help_text="If this invitation is for an existing family member"
    )
    
    # Invitation details
    invitation_message = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    
    # Meta
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)
    
    # Security
    invitation_token = models.CharField(max_length=64, unique=True)
    
    def __str__(self):
        return f"Invitation to {self.invited_email} for {self.tree.name}"

# Signal handlers for maintaining data consistency
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=FamilyMember)
def create_privacy_settings(sender, instance, created, **kwargs):
    """Automatically create privacy settings for new family members."""
    if created:
        MemberPrivacySettings.objects.create(member=instance)

@receiver(post_save, sender=UpdateLike)
def update_likes_count(sender, instance, created, **kwargs):
    """Update likes count when a like is added."""
    if created:
        instance.update.likes_count = instance.update.likes.count()
        instance.update.save(update_fields=['likes_count'])

@receiver(post_delete, sender=UpdateLike)
def decrease_likes_count(sender, instance, **kwargs):
    """Update likes count when a like is removed."""
    instance.update.likes_count = instance.update.likes.count()
    instance.update.save(update_fields=['likes_count'])

@receiver(post_save, sender=UpdateComment)
def update_comments_count(sender, instance, created, **kwargs):
    """Update comments count when a comment is added."""
    if created:
        instance.update.comments_count = instance.update.comments.count()
        instance.update.save(update_fields=['comments_count'])

@receiver(post_delete, sender=UpdateComment)
def decrease_comments_count(sender, instance, **kwargs):
    """Update comments count when a comment is removed."""
    instance.update.comments_count = instance.update.comments.count()
    instance.update.save(update_fields=['comments_count'])
