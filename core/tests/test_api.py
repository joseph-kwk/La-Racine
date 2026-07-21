"""
core/tests/test_api.py — Registration, Auth, Profile API tests
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='testuser', email='test@example.com', password='password123'
    )


@pytest.fixture
def auth_client(client, user):
    response = client.post('/api/auth/token/', {
        'username': 'testuser',
        'password': 'password123',
    })
    token = response.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


# ─── Registration ────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRegister:

    def test_register_success(self, client):
        res = client.post('/api/auth/register/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'securepass1',
        })
        assert res.status_code == status.HTTP_201_CREATED
        assert 'access' in res.data
        assert 'refresh' in res.data
        assert res.data['user']['username'] == 'newuser'

    def test_register_duplicate_email_returns_400(self, client, user):
        """BUG #1: was returning 500 due to raise Exception()"""
        res = client.post('/api/auth/register/', {
            'username': 'another',
            'email': 'test@example.com',  # already taken
            'password': 'securepass1',
        })
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        # Must be a validation error, not a server error
        assert res.status_code != status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_register_duplicate_email_case_insensitive(self, client, user):
        """Email check should be case-insensitive."""
        res = client.post('/api/auth/register/', {
            'username': 'another2',
            'email': 'TEST@EXAMPLE.COM',  # same as test@example.com
            'password': 'securepass1',
        })
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_missing_email_returns_400(self, client):
        res = client.post('/api/auth/register/', {
            'username': 'nomail',
            'password': 'securepass1',
        })
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_short_password_returns_400(self, client):
        res = client.post('/api/auth/register/', {
            'username': 'shortpw',
            'email': 'short@example.com',
            'password': 'abc',
        })
        assert res.status_code == status.HTTP_400_BAD_REQUEST


# ─── MeView ──────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMeView:

    def test_me_get_authenticated(self, auth_client, user):
        res = auth_client.get('/api/auth/me/')
        assert res.status_code == status.HTTP_200_OK
        assert res.data['username'] == 'testuser'
        assert res.data['email'] == 'test@example.com'

    def test_me_get_unauthenticated(self, client):
        res = client.get('/api/auth/me/')
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_patch_name(self, auth_client, user):
        res = auth_client.patch('/api/auth/me/', {
            'first_name': 'Joseph',
            'last_name': 'K',
        })
        assert res.status_code == status.HTTP_200_OK
        assert res.data['first_name'] == 'Joseph'
        assert res.data['last_name'] == 'K'

    def test_me_patch_duplicate_email_returns_400(self, auth_client, db):
        """BUG #11: patch must not allow stealing another user's email."""
        User.objects.create_user(
            username='other', email='other@example.com', password='pw12345678'
        )
        res = auth_client.patch('/api/auth/me/', {'email': 'other@example.com'})
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_me_patch_own_email_ok(self, auth_client, user):
        """Patching to the same email (case change) should succeed."""
        res = auth_client.patch('/api/auth/me/', {'email': 'TEST@EXAMPLE.COM'})
        assert res.status_code == status.HTTP_200_OK


# ─── UserProfile ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUserProfile:

    def test_me_profile_endpoint(self, auth_client):
        res = auth_client.get('/api/userprofiles/me/')
        assert res.status_code == status.HTTP_200_OK

    def test_me_profile_patch_language(self, auth_client):
        res = auth_client.patch('/api/userprofiles/me/', {
            'preferred_language': 'fr',
        })
        assert res.status_code == status.HTTP_200_OK
        assert res.data['preferred_language'] == 'fr'

    def test_cannot_post_profile_for_another_user(self, auth_client, db):
        """BUG #6: non-staff should not create profiles for other users."""
        other = User.objects.create_user(
            username='victim', email='victim@example.com', password='pw12345678'
        )
        # After fix: profile already exists for auth user so this returns 403
        res = auth_client.post('/api/userprofiles/', {'user': other.pk, 'display_name': 'Hacked'})
        assert res.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_400_BAD_REQUEST,
        )