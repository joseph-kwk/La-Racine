from django.db import models
from django.conf import settings

class Tree(models.Model):
    TREE_TYPE_CHOICES = [
        ('primary', 'Primary Family'),
        ('maternal', 'Maternal Line'),
        ('paternal', 'Paternal Line'),
        ('extended', 'Extended Family'),
        ('adopted', 'Adopted Family'),
        ('step', 'Step Family'),
        ('other', 'Other'),
    ]
    
    PRIVACY_LEVEL_CHOICES = [
        ('public', 'Public'),
        ('shared', 'Shared'),
        ('private', 'Private'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, help_text="A brief description of this family tree")
    tree_type = models.CharField(max_length=20, choices=TREE_TYPE_CHOICES, default='primary')
    privacy_level = models.CharField(max_length=20, choices=PRIVACY_LEVEL_CHOICES, default='private')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_trees')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class TreePermission(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('editor', 'Editor'),
        ('viewer', 'Viewer'),
        ('guest', 'Guest'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending', 'Pending'),
        ('invited', 'Invited'),
        ('rejected', 'Rejected'),
    ]

    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='permissions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tree_permissions')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_invitations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tree', 'user')

    def __str__(self):
        return f"{self.user.username} - {self.tree.name} ({self.role})"

class FamilyMember(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='members')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    birth_date = models.DateField('Date of Birth', blank=True, null=True)
    death_date = models.DateField('Date of Death', blank=True, null=True)
    relationship = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    photo = models.ImageField(upload_to='members/', blank=True, null=True)
    nickname = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=255, blank=True)
    parent_ids = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='children')
    spouse = models.ForeignKey('self', blank=True, null=True, on_delete=models.SET_NULL, related_name='spouses')
    is_alive = models.BooleanField(default=True)
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def name(self):
        return f"{self.first_name} {self.last_name}"

class Update(models.Model):
    member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE, related_name='updates')
    content = models.TextField()
    media = models.ImageField(upload_to='updates/', blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Update for {self.member.name} at {self.timestamp}"
