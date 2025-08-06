from django.db import models
from django.conf import settings

class Tree(models.Model):
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class FamilyMember(models.Model):
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='members')
    name = models.CharField(max_length=255)
    dob = models.DateField('Date of Birth')
    dod = models.DateField('Date of Death', blank=True, null=True)
    photo = models.ImageField(upload_to='members/', blank=True, null=True)
    bio = models.TextField(blank=True)
    nickname = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=255, blank=True)
    parent_ids = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='children')
    spouse = models.ForeignKey('self', blank=True, null=True, on_delete=models.SET_NULL, related_name='spouses')
    is_alive = models.BooleanField(default=True)
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.name

class Update(models.Model):
    member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE, related_name='updates')
    content = models.TextField()
    media = models.ImageField(upload_to='updates/', blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Update for {self.member.name} at {self.timestamp}"
