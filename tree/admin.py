from django.contrib import admin
from .models import Tree, FamilyMember, Update

@admin.register(Tree)
class TreeAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'created_at')

@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'tree', 'dob', 'is_alive', 'added_by')

@admin.register(Update)
class UpdateAdmin(admin.ModelAdmin):
    list_display = ('member', 'created_by', 'timestamp')
