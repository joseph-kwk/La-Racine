"""
tree/tests/test_calendar.py — Tests for In-App Calendar & External iCal Feed
"""

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from tree.models import (
    Tree, TreePermission, FamilyMember, FamilyRelationship,
    FuzzyDate, FamilyEvent, CalendarFeedToken,
)


@pytest.mark.django_db
class TestCalendarAPI:
    """Test suite for CalendarEventsViewSet and public_calendar_feed."""

    @pytest.fixture(autouse=True)
    def setup_data(self, client):
        self.user = User.objects.create_user(username='caluser', password='Password123!')
        self.tree = Tree.objects.create(name='Calendar Test Tree', created_by=self.user)
        TreePermission.objects.create(tree=self.tree, user=self.user, role='owner', status='active')

        # Birth date for member 1
        bday_date = FuzzyDate.objects.create(date='1990-05-15', precision='exact')
        self.member1 = FamilyMember.objects.create(
            tree=self.tree, first_name='John', last_name='Doe',
            gender='male', birth_date=bday_date, added_by=self.user
        )

        # Deceased member 2
        dday_date = FuzzyDate.objects.create(date='2020-11-20', precision='exact')
        self.member2 = FamilyMember.objects.create(
            tree=self.tree, first_name='Jane', last_name='Doe',
            gender='female', is_alive=False, death_date=dday_date, added_by=self.user
        )

        # Custom event
        self.event = FamilyEvent.objects.create(
            tree=self.tree,
            title='Annual Family Reunion',
            description='Gathering at the lake house',
            event_type='reunion',
            start_date=timezone.now(),
            created_by=self.user,
        )

        client.force_login(self.user)
        self.client = client

    def test_aggregated_events_endpoint(self):
        """Verify aggregated events JSON contains birthdays, memorials, and custom events."""
        res = self.client.get(f'/api/calendar/events/aggregated/?tree_id={self.tree.id}')
        assert res.status_code == 200
        data = res.json()
        assert data['count'] >= 3

        categories = [e['category'] for e in data['events']]
        assert 'Birthday' in categories
        assert 'Memorial' in categories
        assert 'Reunion' in categories

    def test_export_ics_endpoint(self):
        """Verify .ics export endpoint returns valid iCalendar content."""
        res = self.client.get(f'/api/calendar/events/export-ics/?tree_id={self.tree.id}')
        assert res.status_code == 200
        assert res['Content-Type'].startswith('text/calendar')
        content = res.content.decode('utf-8')
        assert 'BEGIN:VCALENDAR' in content
        assert 'BEGIN:VEVENT' in content
        assert 'SUMMARY:🎂 John Doe\'s Birthday' in content
        assert 'END:VCALENDAR' in content

    def test_feed_token_and_public_ics_feed(self):
        """Verify webcal token creation and unauthenticated public .ics feed endpoint."""
        # 1. Get feed token
        res_tok = self.client.get(f'/api/calendar/events/feed-token/?tree_id={self.tree.id}')
        assert res_tok.status_code == 200
        token = res_tok.json()['token']
        assert token

        # 2. Logout and access public .ics feed
        self.client.logout()
        res_pub = self.client.get(f'/api/calendar/feed/{token}.ics')
        assert res_pub.status_code == 200
        assert res_pub['Content-Type'].startswith('text/calendar')
        content = res_pub.content.decode('utf-8')
        assert 'BEGIN:VCALENDAR' in content
        assert 'John Doe\'s Birthday' in content
