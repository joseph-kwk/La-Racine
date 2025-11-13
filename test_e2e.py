"""
End-to-End Test for La Racine
Tests the complete user journey: Register -> Login -> Create Tree -> Add Member -> View Tree
"""
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api"
FRONTEND_URL = "http://localhost:5173"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

def test_backend_running():
    """Test if backend server is running"""
    print_info("Testing backend server...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print_success("Backend server is running")
        return True
    except requests.exceptions.RequestException:
        print_error("Backend server is not running. Start it with: python manage.py runserver")
        return False

def test_user_registration():
    """Test user registration"""
    print_info("Testing user registration...")
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    user_data = {
        "username": f"testuser_{timestamp}",
        "email": f"test_{timestamp}@example.com",
        "password": "TestPassword123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register/", json=user_data)
        if response.status_code == 201:
            data = response.json()
            print_success(f"User registered successfully: {user_data['username']}")
            return data.get('access'), user_data
        else:
            print_error(f"Registration failed: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print_error(f"Registration error: {str(e)}")
        return None, None

def test_user_login(user_data):
    """Test user login"""
    print_info("Testing user login...")
    login_data = {
        "username": user_data['username'],
        "password": user_data['password']
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/token/", json=login_data)
        if response.status_code == 200:
            data = response.json()
            print_success(f"Login successful for {user_data['username']}")
            return data.get('access')
        else:
            print_error(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return None

def test_create_tree(token):
    """Test creating a family tree"""
    print_info("Testing tree creation...")
    tree_data = {
        "name": f"Test Family Tree {datetime.now().strftime('%Y%m%d%H%M%S')}"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/trees/", json=tree_data, headers=headers)
        if response.status_code == 201:
            data = response.json()
            print_success(f"Tree created successfully: {data.get('name')}")
            return data.get('id')
        else:
            print_error(f"Tree creation failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Tree creation error: {str(e)}")
        return None

def test_add_member(token, tree_id):
    """Test adding a family member"""
    print_info("Testing member addition...")
    member_data = {
        "tree": tree_id,
        "first_name": "John",
        "last_name": "Doe",
        "gender": "male",
        "birth_date": "1980-01-15",
        "relationship": "Father",
        "is_alive": True
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/members/",
            json=member_data,
            headers=headers
        )
        if response.status_code == 201:
            data = response.json()
            print_success(f"Member added successfully: {data.get('first_name')} {data.get('last_name')}")
            return data.get('id')
        else:
            print_error(f"Member addition failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Member addition error: {str(e)}")
        return None

def test_view_tree(token, tree_id):
    """Test viewing tree details"""
    print_info("Testing tree viewing...")
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/trees/{tree_id}/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print_success(f"Tree retrieved successfully: {data.get('name')}")
            return True
        else:
            print_error(f"Tree viewing failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Tree viewing error: {str(e)}")
        return False

def test_list_members(token, tree_id):
    """Test listing tree members"""
    print_info("Testing member listing...")
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/members/?tree={tree_id}", headers=headers)
        if response.status_code == 200:
            data = response.json()
            member_count = len(data)
            print_success(f"Members listed successfully: {member_count} member(s) found")
            return True
        else:
            print_error(f"Member listing failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Member listing error: {str(e)}")
        return False

def run_e2e_tests():
    """Run all end-to-end tests"""
    print("\n" + "="*60)
    print("🌳 LA RACINE - END-TO-END TEST SUITE")
    print("="*60 + "\n")
    
    # Test 1: Backend running
    if not test_backend_running():
        print_error("\nTests aborted: Backend server not running")
        return False
    
    print()
    
    # Test 2: User registration
    token, user_data = test_user_registration()
    if not token:
        print_error("\nTests aborted: User registration failed")
        return False
    
    print()
    
    # Test 3: User login
    login_token = test_user_login(user_data)
    if not login_token:
        print_warning("Login test failed, but continuing with registration token")
        login_token = token
    
    print()
    
    # Test 4: Create tree
    tree_id = test_create_tree(login_token)
    if not tree_id:
        print_error("\nTests aborted: Tree creation failed")
        return False
    
    print()
    
    # Test 5: Add member
    member_id = test_add_member(login_token, tree_id)
    if not member_id:
        print_warning("Member addition failed")
    
    print()
    
    # Test 6: View tree
    test_view_tree(login_token, tree_id)
    
    print()
    
    # Test 7: List members
    test_list_members(login_token, tree_id)
    
    print("\n" + "="*60)
    print(f"{Colors.GREEN}✓ END-TO-END TEST SUITE COMPLETED{Colors.END}")
    print("="*60 + "\n")
    
    print_info("Test Summary:")
    print(f"  • Backend URL: {BASE_URL}")
    print(f"  • Test User: {user_data['username']}")
    print(f"  • Tree ID: {tree_id}")
    print(f"  • Member ID: {member_id}")
    print("\nNext steps:")
    print("  1. Open browser to: " + FRONTEND_URL)
    print("  2. Login with the test credentials above")
    print("  3. Verify you can see the tree and member\n")
    
    return True

if __name__ == "__main__":
    try:
        run_e2e_tests()
    except KeyboardInterrupt:
        print_warning("\n\nTests interrupted by user")
    except Exception as e:
        print_error(f"\n\nUnexpected error: {str(e)}")
