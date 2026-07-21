"""
core/views.py — Authentication & Profile Views

Handles registration, login responses, current user info,
and user profile CRUD.
"""

from rest_framework import generics, permissions, status, serializers as drf_serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.contrib.auth.models import User
from rest_framework.serializers import ModelSerializer, CharField
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile
from .serializers import UserProfileSerializer


class RegisterSerializer(ModelSerializer):
    password = CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name')
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate_email(self, value):
        # BUG #1 FIX: was `raise Exception(...)` which DRF treated as a 500
        if User.objects.filter(email__iexact=value).exists():
            raise ValidationError('A user with this email already exists.')
        return value.lower()

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        return user


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Auto-generate tokens so the user is immediately logged in
        refresh = RefreshToken.for_user(user)

        # Fetch the auto-created profile
        profile = getattr(user, 'profile', None)

        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'profile': UserProfileSerializer(
                profile, context={'request': request}
            ).data if profile else None,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class MeView(APIView):
    """Returns the current authenticated user along with their profile."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        profile = getattr(user, 'profile', None)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'profile': UserProfileSerializer(
                profile, context={'request': request}
            ).data if profile else None,
        })

    def patch(self, request):
        """Allow updating basic user fields (first_name, last_name, email)."""
        user = request.user
        allowed = ('first_name', 'last_name', 'email')
        new_email = request.data.get('email')

        # BUG #11 FIX: check email uniqueness before accepting the PATCH
        if new_email and new_email.lower() != user.email.lower():
            if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response(
                    {'email': 'A user with this email already exists.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        for field in allowed:
            if field in request.data:
                value = request.data[field]
                if field == 'email':
                    value = value.lower()
                setattr(user, field, value)
        user.save()
        return self.get(request)
