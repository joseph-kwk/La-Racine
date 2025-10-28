from django.contrib.auth.models import User, Group
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from tree.models import Tree, FamilyMember, Update

class RolePermissionTests(APITestCase):
    def setUp(self):
        # Seed roles
        for role in ['Viewer', 'Editor', 'Admin']:
            Group.objects.get_or_create(name=role)

        self.viewer = User.objects.create_user('viewer', password='pass')
        self.editor = User.objects.create_user('editor', password='pass')
        self.admin = User.objects.create_user('admin', password='pass')
        self.staff = User.objects.create_user('staff', password='pass', is_staff=True)

        Group.objects.get(name='Viewer').user_set.add(self.viewer)
        Group.objects.get(name='Editor').user_set.add(self.editor)
        Group.objects.get(name='Admin').user_set.add(self.admin)

        # Owner owns this tree
        self.owner = User.objects.create_user('owner', password='pass')
        self.tree = Tree.objects.create(name='Owned Tree', created_by=self.owner)

    def auth(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_viewer_can_list_but_cannot_create(self):
        c = self.auth(self.viewer)
        # List -> OK (empty for viewer)
        resp = c.get('/api/trees/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Create -> Forbidden (no editor/admin role)
        resp = c.post('/api/trees/', {'name': 'New Tree'})
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED))

    def test_editor_can_create_but_not_delete(self):
        c = self.auth(self.editor)
        # Create -> OK
        resp = c.post('/api/trees/', {'name': 'Editor Tree'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        tree_id = resp.data['id']
        # Delete -> Forbidden
        resp = c.delete(f'/api/trees/{tree_id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_own_tree(self):
        c = self.auth(self.admin)
        # Create -> OK
        resp = c.post('/api/trees/', {'name': 'Admin Tree'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        tree_id = resp.data['id']
        # Delete -> Allowed by role + ownership (owns the tree they just created)
        resp = c.delete(f'/api/trees/{tree_id}/')
        self.assertIn(resp.status_code, (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK))

    def test_non_owner_cannot_access_others_tree(self):
        # editor tries to get owner's tree detail -> 404 (filtered) or 403 (object perm)
        c = self.auth(self.editor)
        resp = c.get(f'/api/trees/{self.tree.id}/')
        self.assertIn(resp.status_code, (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN))

    def test_staff_bypasses(self):
        c = self.auth(self.staff)
        # Staff can list all, including owner's tree
        resp = c.get('/api/trees/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Staff can delete any
        resp = c.delete(f'/api/trees/{self.tree.id}/')
        self.assertIn(resp.status_code, (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK))

    def test_tree_delete_forbidden_for_non_owner(self):
        # Editor creates their own tree
        c_editor = self.auth(self.editor)
        resp = c_editor.post('/api/trees/', {'name': 'Editor Owned'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        editor_tree_id = resp.data['id']
        # Viewer (different user) attempts delete -> forbidden
        c_viewer = self.auth(self.viewer)
        resp = c_viewer.delete(f'/api/trees/{editor_tree_id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))
        # Owner (editor) cannot delete due to role policy
        resp = c_editor.delete(f'/api/trees/{editor_tree_id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        # Admin (non-staff) still cannot delete others' trees due to queryset scoping and ownership check
        c_admin = self.auth(self.admin)
        resp = c_admin.delete(f'/api/trees/{editor_tree_id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_family_member_update_forbidden_for_non_owner(self):
        # Setup members: one under owner's tree
        member = FamilyMember.objects.create(tree=self.tree, first_name='John', last_name='Doe')
        # Editor (non-owner) tries to reassign member to their own new tree or edit fields
        c = self.auth(self.editor)
        # Try patch a field (still should be forbidden due to different owner)
        resp = c.patch(f'/api/members/{member.id}/', {'nickname': 'JD'}, format='json')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_update_update_forbidden_for_non_owner(self):
        # Create a member and an update under owner's tree
        member = FamilyMember.objects.create(tree=self.tree, first_name='Jane', last_name='Doe')
        upd = Update.objects.create(member=member, content='Initial')
        # Editor (non-owner) attempts to PATCH content
        c = self.auth(self.editor)
        resp = c.patch(f'/api/updates/{upd.id}/', {'content': 'Edited'}, format='json')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_family_member_delete_forbidden_for_non_owner(self):
        member = FamilyMember.objects.create(tree=self.tree, first_name='Del', last_name='ETE')
        c = self.auth(self.editor)
        resp = c.delete(f'/api/members/{member.id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_update_delete_forbidden_for_non_owner(self):
        member = FamilyMember.objects.create(tree=self.tree, first_name='DelU', last_name='PDE')
        upd = Update.objects.create(member=member, content='x')
        c = self.auth(self.editor)
        resp = c.delete(f'/api/updates/{upd.id}/')
        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))
