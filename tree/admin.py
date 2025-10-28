from django.contrib import admin
from .models import Tree, FamilyMember, Update

@admin.register(Tree)
class TreeAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'created_at', 'member_count')
    list_filter = ('created_at',)
    search_fields = ('name', 'description')
    readonly_fields = ('created_at',)
    
    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'

@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'tree', 'gender', 'birth_date', 'death_date', 'is_alive', 'added_by')
    list_filter = ('tree', 'gender', 'is_alive')
    search_fields = ('first_name', 'last_name', 'nickname')
    fieldsets = (
        ('Basic Information', {
            'fields': ('tree', 'first_name', 'last_name', 'nickname', 'gender')
        }),
        ('Dates', {
            'fields': ('birth_date', 'death_date')
        }),
        ('Additional Details', {
            'fields': ('relationship', 'location', 'notes', 'photo', 'parent_ids')
        }),
        ('System', {
            'fields': ('added_by',),
            'classes': ('collapse',)
        }),
    )

@admin.register(Update)
class UpdateAdmin(admin.ModelAdmin):
    list_display = ('member', 'created_by', 'timestamp')
