"""
core/tests/test_permissions.py — Role-based access control tests

Updated to use the real TreePermission system (tree-scoped roles via
TreePermission model) instead of legacy Django Group-based roles which
are no longer used by any view logic.
"""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from tree.models import Tree, TreePermission, FamilyMember, Update


class RolePermissionTests(APITestCase):

    def setUp(self):
        self.owner   = User.objects.create_user('perm_owner',   password='pass')
        self.editor  = User.objects.create_user('perm_editor',  password='pass')
        self.viewer  = User.objects.create_user('perm_viewer',  password='pass')
        self.stranger = User.objects.create_user('perm_stranger', password='pass')
        self.staff   = User.objects.create_user('perm_staff',   password='pass', is_staff=True)

        # Create the tree and real TreePermissions for it
        self.tree = Tree.objects.create(name='Owned Tree', created_by=self.owner)
        TreePermission.objects.create(tree=self.tree, user=self.owner,  role='owner',  status='active')
        TreePermission.objects.create(tree=self.tree, user=self.editor, role='editor', status='active')
        TreePermission.objects.create(tree=self.tree, user=self.viewer, role='viewer', status='active')

    def auth(self, user):
        c = APIClient()
        c.force_authenticate(user=user)
        return c

    # ── Tree visibility ──────────────────────────────────────────────────────

    def test_viewer_can_list_trees_they_have_access_to(self):
        c = self.auth(self.viewer)
        resp = c.get('/api/trees/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [t['name'] for t in resp.data]
        self.assertIn('Owned Tree', names)

    def test_stranger_cannot_see_private_tree(self):
        c = self.auth(self.stranger)
        resp = c.get(f'/api/trees/{self.tree.id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    # ── Tree creation ────────────────────────────────────────────────────────

    def test_any_authenticated_user_can_create_tree(self):
        """Creating a tree makes you the owner — anyone can create."""
        c = self.auth(self.viewer)
        resp = c.post('/api/trees/', {'name': 'Viewer Own Tree', 'tree_type': 'primary'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # Creator gets owner permission automatically
        perm = TreePermission.objects.get(tree_id=resp.data['id'], user=self.viewer)
        self.assertEqual(perm.role, 'owner')

    # ── Tree deletion ────────────────────────────────────────────────────────

    def test_editor_cannot_delete_tree(self):
        c = self.auth(self.editor)
        resp = c.delete(f'/api/trees/{self.tree.id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_viewer_cannot_delete_tree(self):
        c = self.auth(self.viewer)
        resp = c.delete(f'/api/trees/{self.tree.id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_owner_can_delete_tree(self):
        c = self.auth(self.owner)
        new_tree = Tree.objects.create(name='Delete Me', created_by=self.owner)
        TreePermission.objects.create(tree=new_tree, user=self.owner, role='owner', status='active')
        resp = c.delete(f'/api/trees/{new_tree.id}/')
        self.assertIn(resp.status_code, (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK))

    def test_staff_can_delete_any_tree(self):
        c = self.auth(self.staff)
        new_tree = Tree.objects.create(name='Staff Delete', created_by=self.owner)
        resp = c.delete(f'/api/trees/{new_tree.id}/')
        self.assertIn(resp.status_code, (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK))

    # ── FamilyMember access ──────────────────────────────────────────────────

    def test_editor_can_create_member(self):
        c = self.auth(self.editor)
        resp = c.post('/api/members/', {
            'tree': self.tree.id,
            'first_name': 'Edited',
            'last_name': 'Member',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_viewer_cannot_create_member(self):
        c = self.auth(self.viewer)
        resp = c.post('/api/members/', {
            'tree': self.tree.id,
            'first_name': 'Viewer',
            'last_name': 'Hack',
        })
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST))

    def test_stranger_cannot_see_member(self):
        member = FamilyMember.objects.create(
            tree=self.tree, first_name='Private', last_name='Person'
        )
        c = self.auth(self.stranger)
        resp = c.get(f'/api/members/{member.id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_editor_cannot_delete_member(self):
        member = FamilyMember.objects.create(
            tree=self.tree, first_name='Del', last_name='ETE'
        )
        c = self.auth(self.editor)
        resp = c.delete(f'/api/members/{member.id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_owner_can_delete_member(self):
        member = FamilyMember.objects.create(
            tree=self.tree, first_name='ToDelete', last_name='Now'
        )
        c = self.auth(self.owner)
        resp = c.delete(f'/api/members/{member.id}/')
        self.assertIn(resp.status_code, (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK))

    # ── Legacy Update access ─────────────────────────────────────────────────

    def test_stranger_cannot_see_legacy_update(self):
        member = FamilyMember.objects.create(
            tree=self.tree, first_name='Jane', last_name='Doe'
        )
        upd = Update.objects.create(member=member, content='Private update')
        c = self.auth(self.stranger)
        resp = c.get(f'/api/updates/{upd.id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_staff_sees_all_updates(self):
        member = FamilyMember.objects.create(
            tree=self.tree, first_name='Staff', last_name='View'
        )
        upd = Update.objects.create(member=member, content='Staff sees this')
        c = self.auth(self.staff)
        resp = c.get(f'/api/updates/{upd.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
