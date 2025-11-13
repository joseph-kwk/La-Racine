from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from tree.models import Tree, FamilyMember

class AuthAPITests(APITestCase):
    def setUp(self):
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        self.user = User.objects.create_user(**self.user_data)

    def test_user_registration(self):
        """Test user registration endpoint"""
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'newpass123'
        }
        response = self.client.post('/api/auth/register/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_user_login(self):
        """Test user login endpoint"""
        data = {
            'username': self.user_data['username'],
            'password': self.user_data['password']
        }
        response = self.client.post('/api/auth/token/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_token_refresh(self):
        """Test token refresh endpoint"""
        # First login to get tokens
        login_data = {
            'username': self.user_data['username'],
            'password': self.user_data['password']
        }
        login_response = self.client.post('/api/auth/token/', login_data, format='json')
        refresh_token = login_response.data['refresh']

        # Now refresh
        refresh_data = {'refresh': refresh_token}
        response = self.client.post('/api/auth/token/refresh/', refresh_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        data = {
            'username': 'wronguser',
            'password': 'wrongpass'
        }
        response = self.client.post('/api/auth/token/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TreeAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('testuser', 'test@example.com', 'testpass')
        self.client.force_authenticate(user=self.user)
        self.tree_data = {'name': 'Test Family Tree'}

    def test_create_tree(self):
        """Test creating a new tree"""
        response = self.client.post('/api/trees/', self.tree_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], self.tree_data['name'])
        self.assertEqual(response.data['created_by'], self.user.id)

    def test_list_trees(self):
        """Test listing user's trees"""
        # Create a tree first
        Tree.objects.create(name='Test Tree', created_by=self.user)
        response = self.client.get('/api/trees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_tree_detail(self):
        """Test getting tree details"""
        tree = Tree.objects.create(name='Test Tree', created_by=self.user)
        response = self.client.get(f'/api/trees/{tree.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], tree.name)

    def test_update_tree(self):
        """Test updating tree"""
        tree = Tree.objects.create(name='Old Name', created_by=self.user)
        update_data = {'name': 'New Name'}
        response = self.client.put(f'/api/trees/{tree.id}/', update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tree.refresh_from_db()
        self.assertEqual(tree.name, 'New Name')

    def test_delete_tree(self):
        """Test deleting tree with Admin role"""
        from django.contrib.auth.models import Group
        # Give user Admin role (Django group) for permission to delete
        admin_group, _ = Group.objects.get_or_create(name='Admin')
        self.user.groups.add(admin_group)
        
        tree = Tree.objects.create(name='Test Tree', created_by=self.user)
        response = self.client.delete(f'/api/trees/{tree.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Tree.objects.filter(id=tree.id).exists())


class MemberAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('testuser', 'test@example.com', 'testpass')
        self.client.force_authenticate(user=self.user)
        self.tree = Tree.objects.create(name='Test Tree', created_by=self.user)
        self.member_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'gender': 'male',
            'birth_date': '1990-01-01'
        }

    def test_create_member(self):
        """Test creating a family member"""
        # Add tree field to member data
        member_data_with_tree = {**self.member_data, 'tree': self.tree.id}
        response = self.client.post('/api/members/', member_data_with_tree, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['first_name'], self.member_data['first_name'])
        self.assertEqual(response.data['tree'], self.tree.id)

    def test_list_members(self):
        """Test listing tree members"""
        FamilyMember.objects.create(tree=self.tree, first_name='Jane', last_name='Doe')
        response = self.client.get(f'/api/trees/{self.tree.id}/members/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_member_detail(self):
        """Test getting member details"""
        member = FamilyMember.objects.create(tree=self.tree, first_name='Jane', last_name='Doe')
        response = self.client.get(f'/api/members/{member.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], member.first_name)

    def test_update_member(self):
        """Test updating member"""
        member = FamilyMember.objects.create(
            tree=self.tree, 
            first_name='Jane', 
            last_name='Doe',
            gender='female'
        )
        # Include all required fields in update
        update_data = {
            'first_name': 'Janet',
            'last_name': 'Doe',
            'gender': 'female',
            'tree': self.tree.id
        }
        response = self.client.put(f'/api/members/{member.id}/', update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        member.refresh_from_db()
        self.assertEqual(member.first_name, 'Janet')

    def test_delete_member(self):
        """Test deleting member with Admin role"""
        from django.contrib.auth.models import Group
        # Give user Admin role (Django group) for permission to delete
        admin_group, _ = Group.objects.get_or_create(name='Admin')
        self.user.groups.add(admin_group)
        
        member = FamilyMember.objects.create(tree=self.tree, first_name='Jane', last_name='Doe')
        response = self.client.delete(f'/api/members/{member.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(FamilyMember.objects.filter(id=member.id).exists())