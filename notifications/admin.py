from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('type', 'target_user', 'event_date', 'related_member', 'created_at')
