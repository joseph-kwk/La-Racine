"""
tree/tests/test_api.py — Tree, Member, ChangeRequest, Relationship, Invitation API tests
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from tree.models import Tree, TreePermission, FamilyMember


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        username='owner', email='owner@example.com', password='password123'
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username='stranger', email='stranger@example.com', password='password123'
    )


def get_token(client, username, password='password123'):
    res = client.post('/api/auth/token/', {'username': username, 'password': password})
    return res.data['access']


@pytest.fixture
def owner_client(api_client, owner):
    token = get_token(api_client, 'owner')
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def other_client(api_client, other_user):
    c = APIClient()
    token = get_token(c, 'stranger')
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return c


@pytest.fixture
def tree(owner):
    t = Tree.objects.create(
        name='Test Tree',
        created_by=owner,
        privacy_level='private',
        require_approval_for_edits=False,  # auto-approve for most tests
    )
    TreePermission.objects.create(tree=t, user=owner, role='owner', status='active')
    return t


@pytest.fixture
def member(tree, owner):
    return FamilyMember.objects.create(
        tree=tree,
        first_name='John',
        last_name='Doe',
        added_by=owner,
    )


# ─── Tree CRUD ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestTreeCRUD:

    def test_create_tree(self, owner_client):
        res = owner_client.post('/api/trees/', {
            'name': 'My Family',
            'tree_type': 'primary',
            'privacy_level': 'private',
        })
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['name'] == 'My Family'

    def test_list_trees_filtered_by_user(self, owner_client, tree, other_user):
        """Users should only see trees they have access to."""
        # Create a tree owned by someone else — should not appear
        Tree.objects.create(name='Other Tree', created_by=other_user)
        res = owner_client.get('/api/trees/')
        assert res.status_code == status.HTTP_200_OK
        names = [t['name'] for t in res.data]
        assert 'Test Tree' in names
        assert 'Other Tree' not in names

    def test_unauthenticated_cannot_list_trees(self, api_client):
        res = api_client.get('/api/trees/')
        assert res.status_code == status.HTTP_401_UNAUTHORIZED


# ─── FamilyMember CRUD ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFamilyMemberCRUD:

    def test_create_member(self, owner_client, tree):
        res = owner_client.post('/api/members/', {
            'tree': tree.pk,
            'first_name': 'Jane',
            'last_name': 'Doe',
        })
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['first_name'] == 'Jane'

    def test_stranger_cannot_create_member(self, other_client, tree):
        """A user with no tree access should be blocked."""
        res = other_client.post('/api/members/', {
            'tree': tree.pk,
            'first_name': 'Hacker',
            'last_name': 'X',
        })
        assert res.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        )

    def test_member_age_precision_exact(self, member, owner_client):
        """BUG #3 regression: age should display as exact when precision='exact'."""
        from tree.models import FuzzyDate
        fd = FuzzyDate.objects.create(date='1980-05-15', precision='exact')
        member.birth_date = fd
        member.save()
        res = owner_client.get(f'/api/members/{member.pk}/')
        assert res.status_code == status.HTTP_200_OK
        age = res.data['age']
        assert age is not None
        # Must NOT contain '~' (which indicates approximate)
        assert '~' not in age


# ─── Cross-tree Relationship (Bug #7) ────────────────────────────────────────

@pytest.mark.django_db
class TestCrossTreeRelationship:

    def test_cannot_link_members_from_different_trees(self, owner_client, owner, tree, member):
        """BUG #7: relationships must be within the same tree."""
        other_tree = Tree.objects.create(
            name='Other Tree', created_by=owner, privacy_level='private'
        )
        TreePermission.objects.create(
            tree=other_tree, user=owner, role='owner', status='active'
        )
        other_member = FamilyMember.objects.create(
            tree=other_tree, first_name='Alice', last_name='Smith', added_by=owner
        )
        res = owner_client.post('/api/relationships/', {
            'from_member': member.pk,
            'to_member': other_member.pk,
            'relationship_type': 'sibling',
        })
        assert res.status_code == status.HTTP_400_BAD_REQUEST


# ─── ChangeRequest (Bug #8, #9) ───────────────────────────────────────────────

@pytest.mark.django_db
class TestChangeRequest:

    def test_propose_change_stores_null_correctly(self, owner_client, member):
        """BUG #8: old_value should be JSON null not string 'None'."""
        res = owner_client.post(f'/api/members/{member.pk}/propose-change/', {
            'field_name': 'nickname',
            'new_value': 'Johnny',
            'reason': 'prefers it',
        })
        assert res.status_code == status.HTTP_201_CREATED
        from tree.models import ChangeRequest
        cr = ChangeRequest.objects.get(pk=res.data['id'])
        # old_value should be None (JSON null) not the string "None"
        assert cr.old_value is None or cr.old_value != 'None'

    def test_stranger_cannot_create_change_request(self, other_client, member):
        """BUG #9: unauthenticated tree users should be blocked."""
        res = other_client.post('/api/change-requests/', {
            'member': member.pk,
            'field_name': 'biography',
            'new_value': 'Hacked bio',
        })
        assert res.status_code in (
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        )


# ─── Invitation accept (Bug #12) ─────────────────────────────────────────────

@pytest.mark.django_db
class TestInvitationAccept:

    def test_accept_with_invalid_token_returns_404(self, api_client):
        res = api_client.post('/api/invitations/accept/', {'token': 'badtoken'})
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_accept_without_token_returns_400(self, api_client):
        res = api_client.post('/api/invitations/accept/', {})
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_accept_valid_token_grants_access(self, owner_client, owner, tree, other_user):
        """BUG #12 regression: accepting should upgrade existing permission."""
        from django.utils import timezone
        from datetime import timedelta
        from tree.models import TreeInvitation

        inv = TreeInvitation.objects.create(
            tree=tree,
            invited_email=other_user.email,
            invited_name=other_user.username,
            role='editor',
            invited_by=owner,
            expires_at=timezone.now() + timedelta(days=7),
        )

        # Pre-existing viewer permission — should be upgraded to editor
        TreePermission.objects.create(
            tree=tree, user=other_user, role='viewer', status='active'
        )

        other_c = APIClient()
        token = get_token(other_c, 'stranger')
        other_c.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        res = other_c.post('/api/invitations/accept/', {'token': inv.invitation_token})
        assert res.status_code == status.HTTP_200_OK
        assert res.data['role'] == 'editor'

        perm = TreePermission.objects.get(tree=tree, user=other_user)
        assert perm.role == 'editor'
        assert perm.status == 'active'
