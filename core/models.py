from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    nickname = models.CharField(max_length=100, blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    current_location = models.CharField(max_length=255, blank=True)
    birthday = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.nickname or self.user.username
