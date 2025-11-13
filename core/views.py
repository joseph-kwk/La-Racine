from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from rest_framework.serializers import ModelSerializer
from rest_framework_simplejwt.tokens import RefreshToken

class RegisterSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password']
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
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
        })
