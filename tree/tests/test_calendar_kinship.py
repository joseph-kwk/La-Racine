"""
tree/tests/test_calendar_kinship.py — Tests for Kinship Scope Calendar Filtering
"""

import pytest
from django.contrib.auth.models import User
from tree.models import Tree, TreePermission, FamilyMember, FamilyRelationship, FuzzyDate
from tree.kinship_utils import compute_kinship_map


@pytest.mark.django_db
class TestCalendarKinship:
    """Test suite for kinship graph distance resolution & calendar scope filtering."""

    @pytest.fixture(autouse=True)
    def setup_family(self, client):
        self.user = User.objects.create_user(username='kinuser', password='Password123!')
        self.tree = Tree.objects.create(name='Kinship Tree', created_by=self.user)
        TreePermission.objects.create(tree=self.tree, user=self.user, role='owner', status='active')

        # Self member (Focus)
        b1 = FuzzyDate.objects.create(date='1990-01-01', precision='exact')
        self.me = FamilyMember.objects.create(
            tree=self.tree, first_name='John', last_name='Doe',
            gender='male', birth_date=b1, added_by=self.user, user_account=self.user
        )

        # Spouse (Immediate)
        b2 = FuzzyDate.objects.create(date='1992-02-02', precision='exact')
        self.spouse = FamilyMember.objects.create(
            tree=self.tree, first_name='Jane', last_name='Doe',
            gender='female', birth_date=b2, added_by=self.user
        )
        FamilyRelationship.objects.create(
            from_member=self.me, to_member=self.spouse, relationship_type='spouse'
        )

        # Parent (Immediate)
        b3 = FuzzyDate.objects.create(date='1965-03-03', precision='exact')
        self.father = FamilyMember.objects.create(
            tree=self.tree, first_name='Robert', last_name='Doe',
            gender='male', birth_date=b3, added_by=self.user
        )
        FamilyRelationship.objects.create(
            from_member=self.father, to_member=self.me, relationship_type='parent'
        )

        # Grandparent (Lineal)
        b4 = FuzzyDate.objects.create(date='1940-04-04', precision='exact')
        self.grandpa = FamilyMember.objects.create(
            tree=self.tree, first_name='Arthur', last_name='Doe',
            gender='male', birth_date=b4, added_by=self.user
        )
        FamilyRelationship.objects.create(
            from_member=self.grandpa, to_member=self.father, relationship_type='parent'
        )

        client.force_login(self.user)
        self.client = client

    def test_kinship_map_computation(self):
        """Verify graph BFS distance and kinship classification."""
        kin_map = compute_kinship_map(self.me)
        assert kin_map[self.me.id]['scope'] == 'immediate'
        assert kin_map[self.spouse.id]['scope'] == 'immediate'
        assert kin_map[self.father.id]['scope'] == 'immediate'
        assert kin_map[self.grandpa.id]['scope'] == 'lineal'

    def test_aggregated_events_scope_filtering(self):
        """Verify API filters events according to scope=immediate vs scope=lineal vs scope=all."""
        # 1. Immediate Family scope
        res1 = self.client.get(f'/api/calendar/events/aggregated/?tree_id={self.tree.id}&scope=immediate')
        assert res1.status_code == 200
        events1 = res1.json()['events']
        member_ids1 = [e.get('member_id') for e in events1 if 'member_id' in e]
        assert self.me.id in member_ids1
        assert self.spouse.id in member_ids1
        assert self.father.id in member_ids1
        assert self.grandpa.id not in member_ids1 # Grandparent excluded in immediate scope

        # 2. Lineal Ancestor scope
        res2 = self.client.get(f'/api/calendar/events/aggregated/?tree_id={self.tree.id}&scope=lineal')
        assert res2.status_code == 200
        events2 = res2.json()['events']
        member_ids2 = [e.get('member_id') for e in events2 if 'member_id' in e]
        assert self.grandpa.id in member_ids2 # Included in lineal scope!
