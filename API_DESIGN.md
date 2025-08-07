# API Design for La Racine Family Tree System

## 🔗 RESTful API Endpoints

### **Authentication & User Management**

#### User Registration & Login
```
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
POST /api/auth/refresh/
GET  /api/auth/user/
PUT  /api/auth/user/
```

#### User Profiles
```
GET  /api/profiles/me/
PUT  /api/profiles/me/
GET  /api/profiles/{user_id}/
```

---

### **Tree Management**

#### Tree CRUD Operations
```
GET    /api/trees/                    # List user's accessible trees
POST   /api/trees/                    # Create new tree
GET    /api/trees/{tree_id}/          # Get tree details
PUT    /api/trees/{tree_id}/          # Update tree (owner only)
DELETE /api/trees/{tree_id}/          # Delete tree (owner only)
```

#### Tree Permissions
```
GET    /api/trees/{tree_id}/permissions/           # List tree permissions
POST   /api/trees/{tree_id}/permissions/           # Grant permission
PUT    /api/trees/{tree_id}/permissions/{user_id}/ # Update permission
DELETE /api/trees/{tree_id}/permissions/{user_id}/ # Revoke permission
```

#### Tree Statistics
```
GET /api/trees/{tree_id}/stats/
Response:
{
  "total_members": 156,
  "living_members": 89,
  "deceased_members": 67,
  "generations": 6,
  "countries_represented": ["USA", "France", "Canada"],
  "most_common_surname": "Smith",
  "oldest_member": {...},
  "youngest_member": {...},
  "recent_additions": 5
}
```

---

### **Family Members**

#### Member CRUD Operations
```
GET    /api/trees/{tree_id}/members/              # List tree members (filtered by permissions)
POST   /api/trees/{tree_id}/members/              # Add new member
GET    /api/members/{member_id}/                  # Get member details
PUT    /api/members/{member_id}/                  # Update member
DELETE /api/members/{member_id}/                  # Delete member
```

#### Member Search & Filtering
```
GET /api/trees/{tree_id}/members/search/?q={query}
GET /api/trees/{tree_id}/members/?
    gender=male&
    birth_year_min=1950&
    birth_year_max=2000&
    location=California&
    is_alive=true&
    has_photo=true
```

#### Member Relationships
```
GET    /api/members/{member_id}/relationships/         # Get all relationships
POST   /api/members/{member_id}/relationships/         # Create relationship
PUT    /api/relationships/{relationship_id}/           # Update relationship
DELETE /api/relationships/{relationship_id}/           # Delete relationship

GET /api/members/{member_id}/ancestors/               # Get ancestors tree
GET /api/members/{member_id}/descendants/             # Get descendants tree
GET /api/members/{member_id}/siblings/                # Get siblings
GET /api/members/{member_id}/spouses/                 # Get spouses/partners
```

#### Relationship Path Finding
```
GET /api/members/{member1_id}/relationship-to/{member2_id}/
Response:
{
  "path": [
    {"member": {...}, "relationship": "child"},
    {"member": {...}, "relationship": "parent"},
    {"member": {...}, "relationship": "sibling"}
  ],
  "description": "Second cousin",
  "degrees_of_separation": 4
}
```

---

### **Privacy & Permissions**

#### Member Privacy Settings
```
GET /api/members/{member_id}/privacy/
PUT /api/members/{member_id}/privacy/
{
  "basic_info_level": "family",
  "birth_date_level": "close_family",
  "location_level": "private",
  "photos_level": "family",
  "allow_photo_tagging": true,
  "notify_on_updates": true
}
```

#### Consent Management
```
POST /api/members/{member_id}/request-consent/
GET  /api/consent-requests/                    # List pending consent requests
POST /api/consent-requests/{request_id}/accept/
POST /api/consent-requests/{request_id}/decline/
```

---

### **Family Updates & Social Features**

#### Family Updates
```
GET    /api/trees/{tree_id}/updates/               # Get family updates feed
POST   /api/trees/{tree_id}/updates/               # Create family update
GET    /api/updates/{update_id}/                   # Get update details
PUT    /api/updates/{update_id}/                   # Update (author only)
DELETE /api/updates/{update_id}/                   # Delete (author only)
```

#### Update Interactions
```
POST   /api/updates/{update_id}/like/              # Like/unlike update
GET    /api/updates/{update_id}/comments/          # Get comments
POST   /api/updates/{update_id}/comments/          # Add comment
PUT    /api/comments/{comment_id}/                 # Edit comment
DELETE /api/comments/{comment_id}/                 # Delete comment
```

---

### **Photo Management**

#### Photo Operations
```
GET    /api/trees/{tree_id}/photos/                # Get tree photos
POST   /api/trees/{tree_id}/photos/                # Upload photo
GET    /api/photos/{photo_id}/                     # Get photo details
PUT    /api/photos/{photo_id}/                     # Update photo
DELETE /api/photos/{photo_id}/                     # Delete photo
```

#### Photo Tagging
```
GET    /api/photos/{photo_id}/tags/                # Get photo tags
POST   /api/photos/{photo_id}/tags/                # Tag member in photo
DELETE /api/photo-tags/{tag_id}/                   # Remove tag
POST   /api/photo-tags/{tag_id}/confirm/           # Confirm tag (tagged person)
```

#### Member Photos
```
GET /api/members/{member_id}/photos/               # Get all photos of member
```

---

### **Invitations & Access Management**

#### Tree Invitations
```
GET    /api/trees/{tree_id}/invitations/           # List invitations
POST   /api/trees/{tree_id}/invitations/           # Send invitation
DELETE /api/invitations/{invitation_id}/           # Cancel invitation

# Public endpoints for invitation handling
GET    /api/invitations/verify/{token}/            # Verify invitation token
POST   /api/invitations/accept/{token}/            # Accept invitation
POST   /api/invitations/decline/{token}/           # Decline invitation
```

---

### **Advanced Features**

#### Tree Visualization Data
```
GET /api/trees/{tree_id}/visualization/
Response:
{
  "nodes": [
    {
      "id": "member_123",
      "name": "John Smith",
      "birth_year": 1975,
      "photo_url": "...",
      "gender": "male",
      "is_alive": true,
      "generation": 0
    }
  ],
  "edges": [
    {
      "from": "member_123",
      "to": "member_124", 
      "relationship": "spouse",
      "start_year": 2000
    }
  ],
  "layout": "hierarchical"
}
```

#### Family Timeline
```
GET /api/trees/{tree_id}/timeline/
GET /api/members/{member_id}/timeline/
Response:
{
  "events": [
    {
      "date": "1975-03-15",
      "type": "birth",
      "member": {...},
      "description": "Born in New York, NY"
    },
    {
      "date": "2000-06-10",
      "type": "marriage",
      "members": [{...}, {...}],
      "description": "Married Jane Doe"
    }
  ]
}
```

#### Import/Export
```
POST /api/trees/{tree_id}/import/                 # Import from GEDCOM/other formats
GET  /api/trees/{tree_id}/export/?format=gedcom   # Export tree data
GET  /api/trees/{tree_id}/backup/                 # Full tree backup
```

#### Analytics & Reports
```
GET /api/trees/{tree_id}/analytics/surname-frequency/
GET /api/trees/{tree_id}/analytics/geographic-distribution/
GET /api/trees/{tree_id}/analytics/generation-stats/
GET /api/trees/{tree_id}/analytics/migration-patterns/
```

---

## 🔒 Permission System Implementation

### Permission Checking Middleware
```python
def check_tree_permission(tree_id, user, required_role='viewer'):
    """
    Check if user has required permission level for tree.
    
    Roles hierarchy: guest < viewer < editor < owner
    """
    try:
        permission = TreePermission.objects.get(
            tree_id=tree_id, 
            user=user, 
            is_active=True
        )
        
        if permission.expires_at and permission.expires_at < timezone.now():
            return False
            
        role_hierarchy = {
            'guest': 0,
            'viewer': 1, 
            'editor': 2,
            'owner': 3
        }
        
        user_level = role_hierarchy.get(permission.role, 0)
        required_level = role_hierarchy.get(required_role, 1)
        
        return user_level >= required_level
        
    except TreePermission.DoesNotExist:
        return False

def check_member_visibility(member, user, tree_permission_role):
    """
    Check if member data is visible to user based on privacy settings.
    """
    privacy = member.privacy_settings
    
    # Owner can see everything
    if tree_permission_role == 'owner':
        return True
        
    # Member can see their own data
    if member.user_account == user:
        return True
        
    # Check privacy level requirements
    visibility_levels = {
        'public': ['guest', 'viewer', 'editor', 'owner'],
        'family': ['viewer', 'editor', 'owner'],
        'close_family': ['editor', 'owner'],
        'private': ['owner']
    }
    
    allowed_roles = visibility_levels.get(member.privacy_level, [])
    return tree_permission_role in allowed_roles
```

### API Response Filtering
```python
class MemberSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        """Filter member data based on user permissions."""
        data = super().to_representation(instance)
        user = self.context['request'].user
        
        # Get user's permission level for this tree
        tree_permission = get_user_tree_permission(user, instance.tree)
        
        # Apply privacy filters
        privacy = instance.privacy_settings
        
        # Filter birth date based on privacy
        if not check_field_visibility(privacy.birth_date_level, tree_permission.role):
            data.pop('birth_date', None)
            
        # Filter location based on privacy  
        if not check_field_visibility(privacy.location_level, tree_permission.role):
            data.pop('current_location', None)
            data.pop('birth_location', None)
            
        # Filter photos based on privacy
        if not check_field_visibility(privacy.photos_level, tree_permission.role):
            data.pop('profile_photo', None)
            
        return data
```

---

## 📱 Real-time Features with WebSockets

### WebSocket Events
```javascript
// Tree activity feed
ws://localhost:8000/ws/trees/{tree_id}/

// Real-time events:
{
  "type": "member_added",
  "data": {...},
  "user": "john_smith",
  "timestamp": "2025-01-15T10:30:00Z"
}

{
  "type": "relationship_created", 
  "data": {...},
  "user": "jane_doe",
  "timestamp": "2025-01-15T10:31:00Z"
}

{
  "type": "update_posted",
  "data": {...},
  "user": "admin",
  "timestamp": "2025-01-15T10:32:00Z"
}
```

### Notification System
```
GET  /api/notifications/                          # Get user notifications
PUT  /api/notifications/{notification_id}/read/   # Mark as read
POST /api/notifications/mark-all-read/            # Mark all as read

# Notification types:
- member_added_to_tree
- relationship_created  
- photo_tagged
- update_posted
- comment_added
- permission_granted
- invitation_received
```

---

## 🧪 API Testing Examples

### Authentication
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "email": "john@example.com", "password": "securepass123"}'

# Login  
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "password": "securepass123"}'
```

### Tree Operations
```bash
# Create tree
curl -X POST http://localhost:8000/api/trees/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Smith Family Tree", "tree_type": "primary", "description": "Our family history"}'

# Add family member
curl -X POST http://localhost:8000/api/trees/1/members/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Smith", 
    "birth_date": "1975-03-15",
    "gender": "male",
    "birth_location": "New York, NY"
  }'
```

### Relationship Creation
```bash
# Create parent-child relationship
curl -X POST http://localhost:8000/api/members/1/relationships/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "to_member": 2,
    "relationship_type": "child",
    "start_date": "1975-03-15",
    "is_biological": true
  }'
```

This comprehensive API design provides a robust foundation for the La Racine family tree system, supporting complex family relationships, granular privacy controls, and rich social features while maintaining security and performance.
