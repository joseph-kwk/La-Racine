"""
notifications/tests/test_api.py — Notification API tests
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from notifications.models import Notification


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='notifuser', email='notif@example.com', password='password123'
    )


@pytest.fixture
def auth_client(client, user):
    res = client.post('/api/auth/token/', {
        'username': 'notifuser', 'password': 'password123'
    })
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {res.data["access"]}')
    return client


@pytest.fixture
def notification(user):
    return Notification.objects.create(
        recipient=user,
        event_type='system',
        channel='in_app',
        title='Test notification',
        body='Hello!',
        status='sent',
    )


# ─── Unread Count ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUnreadCount:

    def test_unread_count_zero(self, auth_client):
        res = auth_client.get('/api/notifications/unread-count/')
        assert res.status_code == status.HTTP_200_OK
        assert res.data['unread_count'] == 0

    def test_unread_count_increments(self, auth_client, notification):
        res = auth_client.get('/api/notifications/unread-count/')
        assert res.data['unread_count'] == 1

    def test_unread_count_after_mark_read(self, auth_client, notification):
        # Mark as read
        auth_client.patch(f'/api/notifications/{notification.pk}/read/')
        res = auth_client.get('/api/notifications/unread-count/')
        assert res.data['unread_count'] == 0


# ─── Mark-all-read (Bug #5 regression) ───────────────────────────────────────

@pytest.mark.django_db
class TestMarkAllRead:

    def test_mark_all_read_returns_200(self, auth_client, notification):
        """BUG #5: POST was blocked by http_method_names — must now return 200."""
        res = auth_client.post('/api/notifications/mark-all-read/')
        assert res.status_code == status.HTTP_200_OK
        assert res.data['marked_read'] == 1

    def test_mark_all_read_idempotent(self, auth_client, notification):
        """Second call should mark 0 (already read)."""
        auth_client.post('/api/notifications/mark-all-read/')
        res = auth_client.post('/api/notifications/mark-all-read/')
        assert res.status_code == status.HTTP_200_OK
        assert res.data['marked_read'] == 0


# ─── Notification list (Bug #10) ──────────────────────────────────────────────

@pytest.mark.django_db
class TestNotificationList:

    def test_list_only_shows_in_app(self, auth_client, user):
        """BUG #10: list should show only in_app, but detail should work for any."""
        email_notif = Notification.objects.create(
            recipient=user, event_type='system',
            channel='email', title='Email notif', status='sent',
        )
        res = auth_client.get('/api/notifications/')
        assert res.status_code == status.HTTP_200_OK
        # Email notification should NOT appear in list
        ids = [n['id'] for n in res.data]
        assert email_notif.pk not in ids

    def test_detail_works_for_any_channel(self, auth_client, user):
        """BUG #10: detail endpoint must not 404 for email/push notifications."""
        email_notif = Notification.objects.create(
            recipient=user, event_type='system',
            channel='email', title='Email notif', status='sent',
        )
        res = auth_client.get(f'/api/notifications/{email_notif.pk}/')
        # Should return 200 since the user owns this notification
        assert res.status_code == status.HTTP_200_OK

    def test_cannot_post_notification(self, auth_client):
        """System creates notifications — users should get 405."""
        res = auth_client.post('/api/notifications/', {
            'event_type': 'system', 'channel': 'in_app', 'title': 'hack'
        })
        assert res.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
