"""
la_racine/urls.py — Main URL Configuration

API v1 routes covering all La Racine resources.
"""

from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.templatetags.static import static
from django.http import JsonResponse
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Core
from core.api import UserProfileViewSet
from core.views import RegisterView, MeView

# Tree (all models)
from tree.api import (
    TreeViewSet,
    FamilyMemberViewSet,
    FamilyRelationshipViewSet,
    ChangeRequestViewSet,
    ChangeRequestValidatorViewSet,
    FamilyPhotoViewSet,
    FamilyUpdateViewSet,
    TreeInvitationViewSet,
    UpdateViewSet,
    FuzzyDateViewSet,
)

# Notifications
from notifications.api import NotificationViewSet

# History
from history.api import HistoryEventViewSet, LifeEventViewSet, AuditLogViewSet


def api_root(request):
    return JsonResponse({
        'message': 'La Racine Family Tree API',
        'version': '2.0',
        'documentation': '/api/',
        'endpoints': {
            'auth': {
                'register':        '/api/auth/register/',
                'me':              '/api/auth/me/',
                'token':           '/api/auth/token/',
                'token_refresh':   '/api/auth/token/refresh/',
            },
            'resources': {
                'profiles':        '/api/userprofiles/',
                'trees':           '/api/trees/',
                'members':         '/api/members/',
                'relationships':   '/api/relationships/',
                'change_requests': '/api/change-requests/',
                'validators':      '/api/validators/',
                'photos':          '/api/photos/',
                'updates':         '/api/family-updates/',
                'invitations':     '/api/invitations/',
                'notifications':   '/api/notifications/',
                'life_events':     '/api/life-events/',
                'audit_log':       '/api/audit-log/',
                'fuzzy_dates':     '/api/fuzzy-dates/',
            }
        }
    })


router = routers.DefaultRouter()

# User accounts
router.register(r'userprofiles', UserProfileViewSet, basename='userprofile')

# Family trees
router.register(r'trees', TreeViewSet, basename='tree')
router.register(r'members', FamilyMemberViewSet, basename='familymember')
router.register(r'relationships', FamilyRelationshipViewSet, basename='relationship')
router.register(r'fuzzy-dates', FuzzyDateViewSet, basename='fuzzydate')

# Change governance
router.register(r'change-requests', ChangeRequestViewSet, basename='changerequest')
router.register(r'validators', ChangeRequestValidatorViewSet, basename='validator')

# Media & social
router.register(r'photos', FamilyPhotoViewSet, basename='photo')
router.register(r'family-updates', FamilyUpdateViewSet, basename='familyupdate')
router.register(r'invitations', TreeInvitationViewSet, basename='invitation')

# Notifications
router.register(r'notifications', NotificationViewSet, basename='notification')

# Timeline & history
router.register(r'life-events', LifeEventViewSet, basename='lifeevent')
router.register(r'audit-log', AuditLogViewSet, basename='auditlog')
router.register(r'history-events', HistoryEventViewSet, basename='historyevent')

# Legacy (backward compat)
router.register(r'updates', UpdateViewSet, basename='update')

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('favicon.ico', RedirectView.as_view(url=static('core/logo.png'), permanent=True)),
    path('api/', include(router.urls)),

    # Auth
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Admin branding is configured in tree/admin.py
