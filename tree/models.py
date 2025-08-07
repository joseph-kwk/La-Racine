from django.db import models
from django.conf import settings

class Tree(models.Model):
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

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
