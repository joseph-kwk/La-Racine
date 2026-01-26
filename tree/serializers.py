from rest_framework import serializers
from .models import Tree, FamilyMember, Update, TreePermission
from django.core.exceptions import ValidationError

class TreeSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    relationship_count = serializers.IntegerField(read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = Tree
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

    def get_role(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated:
            return None
        # Staff are effectively owners
        if user.is_staff:
            return 'owner'
        try:
            perm = TreePermission.objects.get(tree=obj, user=user)
            return perm.role
        except TreePermission.DoesNotExist:
            return None

class FamilyMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMember
        fields = '__all__'
        read_only_fields = ('added_by',)

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        tree = attrs.get('tree') or getattr(self.instance, 'tree', None)
        
        if user and not getattr(user, 'is_staff', False):
            # Check if user has edit rights (owner or editor)
            has_permission = TreePermission.objects.filter(
                tree=tree, 
                user=user, 
                role__in=['owner', 'editor'],
                status='active'
            ).exists()
            
            if not has_permission:
                raise ValidationError('You do not have permission to edit this tree.')
        return attrs

class UpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Update
        fields = '__all__'
        read_only_fields = ('created_by', 'timestamp')

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        member = attrs.get('member') or getattr(self.instance, 'member', None)
        
        if user and not getattr(user, 'is_staff', False):
            tree = member.tree if member else None
            if tree:
                has_permission = TreePermission.objects.filter(
                    tree=tree, 
                    user=user, 
                    role__in=['owner', 'editor'],
                    status='active'
                ).exists()
                
                if not has_permission:
                    raise ValidationError('You do not have permission to post updates to this tree.')
        return attrs
