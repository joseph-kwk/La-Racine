"""
URL configuration for la_racine project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from core.api import UserProfileViewSet
from tree.api import TreeViewSet, FamilyMemberViewSet, UpdateViewSet
from notifications.api import NotificationViewSet
from history.api import HistoryEventViewSet
from core.views import RegisterView, MeView

def api_root(request):
    """API root endpoint"""
    return JsonResponse({
        'message': 'La Racine Family Tree API',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/',
            'auth': {
                'register': '/api/auth/register/',
                'login': '/api/auth/token/',
                'refresh': '/api/auth/token/refresh/',
            }
        }
    })

router = routers.DefaultRouter()
router.register(r'userprofiles', UserProfileViewSet)
router.register(r'trees', TreeViewSet)
router.register(r'members', FamilyMemberViewSet)
router.register(r'updates', UpdateViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'historyevents', HistoryEventViewSet)

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
