from rest_framework import serializers
from .models import Tree, FamilyMember, Update
from django.core.exceptions import ValidationError

class TreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tree
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at')

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
            if tree and getattr(tree, 'created_by', None) != user:
                raise ValidationError('You do not own the selected tree.')
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
            if member and getattr(member, 'tree', None) and getattr(member.tree, 'created_by', None) != user:
                raise ValidationError('You do not own the selected member/tree.')
        return attrs
