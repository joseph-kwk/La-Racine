# 🌳 La Racine Family Tree Management System - Comprehensive Design

## 👥 User Roles & Permissions System

### **1. Tree Owner/Administrator**
- **Full Control**: Create, edit, delete trees and all members
- **User Management**: Invite family members, assign roles, revoke access
- **Privacy Control**: Set visibility levels for entire tree branches
- **Data Export**: Download family data, generate reports
- **Settings**: Configure tree privacy, sharing settings, notifications

### **2. Tree Editor/Contributor**
- **Member Management**: Add new family members, edit existing profiles
- **Photo/Document Upload**: Add photos, documents, stories to members
- **Relationship Building**: Create parent-child, spouse relationships
- **Updates & Stories**: Post family updates, news, milestones
- **Cannot**: Delete tree, change tree settings, remove other editors

### **3. Tree Viewer/Family Member**
- **View Access**: Browse family tree, view member profiles
- **Search & Filter**: Find relatives, search by name/location/date
- **Personal Profile**: Edit their own profile only
- **Comments**: Add comments on updates and photos
- **Cannot**: Add/edit other members, change relationships

### **4. Guest/Limited Viewer**
- **Restricted View**: See only public/shared branches
- **No Personal Data**: Cannot see private information (birthdates, locations)
- **Read-Only**: Cannot interact or comment
- **Time-Limited**: Access can expire

---

## 🌲 Tree Structure & Logic

### **Multiple Tree Management**
Each family can have multiple trees to handle complex family structures:

1. **Primary Family Tree**: Main nuclear family
2. **Maternal Line Tree**: Mother's side ancestry
3. **Paternal Line Tree**: Father's side ancestry
4. **Extended Family Trees**: Adopted family, step-family, chosen family

### **Relationship Mapping Logic**

#### **Parent-Child Relationships**
```
John Smith (Father) ←→ Mary Johnson (Mother)
        ↓
   [Children: Tom, Sarah, Mike]
```

#### **Multiple Marriages/Partnerships**
```
John Smith → Marriage 1 → Mary Johnson (Children: Tom, Sarah)
          → Marriage 2 → Lisa Brown (Children: Mike, Anna)
```

#### **Cross-Tree Connections**
- When a child marries, they can create connections between trees
- Maternal grandmother appears in both maternal tree and spouse's tree
- Smart relationship detection prevents duplicates

---

## 🔐 Privacy & Access Control

### **Privacy Levels per Member**
1. **Public**: Visible to all tree members
2. **Family Only**: Visible to editors and above
3. **Close Family**: Visible to specific invited members
4. **Private**: Visible only to tree owner and member themselves
5. **Deceased Public**: Special level for historical records

### **Living vs Deceased Members**
- **Living Members**: Require consent for data sharing
- **Deceased Members**: More open sharing for historical preservation
- **Auto-Privacy**: Living members default to higher privacy

### **Data Sensitivity Levels**
- **Basic Info**: Name, relationship, photo (lower privacy)
- **Personal Details**: Birth date, location, phone (higher privacy)
- **Sensitive Info**: Medical history, financial info (highest privacy)

---

## 📱 User Interface & Interaction Flows

### **For Tree Owners/Administrators**

#### **Dashboard Features**
- Tree statistics and member counts
- Recent activity feed
- Pending member requests
- User management panel
- Privacy settings overview

#### **Management Actions**
- Create new trees (maternal/paternal/extended)
- Invite family members via email
- Set bulk privacy levels
- Export family data
- Merge duplicate members

### **For Tree Editors/Contributors**

#### **Member Management**
- Add new family member form with relationship selector
- Rich profile editor with photos, documents, stories
- Relationship builder with visual connection tools
- Bulk import from other genealogy platforms

#### **Content Creation**
- Family update posts with photos
- Memorial pages for deceased members
- Family event planning and coordination
- Photo album management

### **For Tree Viewers/Family Members**

#### **Exploration Features**
- Interactive tree visualization with zoom/pan
- Member search with smart filters
- Relationship path finder ("How am I related to X?")
- Timeline view of family history
- Mobile-optimized browsing

#### **Personal Features**
- Edit own profile and privacy settings
- Receive notifications for family updates
- Save favorite family members
- Comment on photos and updates

### **For Guest/Limited Viewers**

#### **Restricted Features**
- Public family tree overview
- Basic member information
- Family photos marked as public
- No personal contact information

---

## 🛠️ Technical Implementation Strategy

### **Database Schema Enhancements**

#### **Tree Permissions Model**
```python
class TreePermission(models.Model):
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(choices=[
        ('owner', 'Owner'),
        ('editor', 'Editor'), 
        ('viewer', 'Viewer'),
        ('guest', 'Guest')
    ])
    granted_by = models.ForeignKey(User, related_name='granted_permissions')
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
```

#### **Member Privacy Model**
```python
class MemberPrivacy(models.Model):
    member = models.OneToOneField(FamilyMember, on_delete=models.CASCADE)
    basic_info_level = models.CharField(choices=PRIVACY_LEVELS)
    personal_details_level = models.CharField(choices=PRIVACY_LEVELS)
    photos_level = models.CharField(choices=PRIVACY_LEVELS)
    contact_info_level = models.CharField(choices=PRIVACY_LEVELS)
    requires_consent = models.BooleanField(default=True)
```

#### **Family Relationship Model**
```python
class FamilyRelationship(models.Model):
    from_member = models.ForeignKey(FamilyMember, related_name='relationships_from')
    to_member = models.ForeignKey(FamilyMember, related_name='relationships_to')
    relationship_type = models.CharField(choices=[
        ('parent', 'Parent'),
        ('child', 'Child'),
        ('spouse', 'Spouse'),
        ('sibling', 'Sibling'),
        ('step_parent', 'Step Parent'),
        ('adopted_child', 'Adopted Child'),
    ])
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
```

### **API Endpoints Structure**

#### **Tree Management**
- `GET/POST /api/trees/` - List/create trees
- `GET/PUT/DELETE /api/trees/{id}/` - Tree details/update/delete
- `GET /api/trees/{id}/members/` - Tree members with permission filtering
- `POST /api/trees/{id}/invite/` - Invite family members

#### **Member Management** 
- `GET/POST /api/trees/{tree_id}/members/` - List/add members
- `GET/PUT/DELETE /api/members/{id}/` - Member CRUD with permission checks
- `POST /api/members/{id}/relationships/` - Create relationships
- `GET /api/members/{id}/timeline/` - Member's life timeline

#### **Permission Management**
- `GET/POST /api/trees/{id}/permissions/` - Manage tree access
- `PUT /api/members/{id}/privacy/` - Update member privacy
- `GET /api/trees/{id}/access-requests/` - Pending access requests

---

## 🎯 User Experience Flows

### **New Family Tree Creation Flow**
1. Owner creates main family tree
2. Adds themselves as root member
3. Invites immediate family (spouse, children, parents)
4. Each invited member can add their own relatives
5. System suggests connections and prevents duplicates

### **Multi-Generational Tree Building**
1. Start with oldest known ancestors
2. Build down through generations
3. Connect marriages and partnerships
4. Handle adoptions and step-relationships
5. Cross-reference with other family trees

### **Privacy Consent Workflow**
1. When adding living relative, system sends consent request
2. Person can accept, decline, or set custom privacy levels
3. Until consent given, only basic info visible
4. Person can join platform to manage their own data

### **Family Reunion Planning**
1. Tree viewer identifies all living relatives in area
2. Creates event with location-based member filtering
3. Sends invitations through platform
4. Manages RSVPs and family updates

---

## 📊 Analytics & Insights

### **Family Statistics Dashboard**
- Total family members across all trees
- Geographic distribution of family
- Living vs deceased member ratios
- Most documented vs least documented branches
- Family growth patterns over time

### **Relationship Analytics**
- Relationship path calculator
- Common ancestor finder
- Family name frequency analysis
- Migration pattern visualization
- Family trait inheritance tracking

---

## 🔮 Advanced Features (Future Enhancements)

### **AI-Powered Features**
- Smart photo tagging and face recognition
- Automatic relationship suggestion
- Historical record matching
- Family story generation from data

### **Integration Capabilities**
- Import from Ancestry.com, FamilySearch
- DNA test result integration
- Social media photo importing
- Calendar integration for birthdays/anniversaries

### **Collaboration Tools**
- Family research projects
- Crowdsourced photo identification
- Family history verification system
- Expert genealogist consultation

---

## 🚀 Implementation Priority

### **Phase 1: Core Infrastructure** (4-6 weeks)
- Enhanced permission system
- Privacy controls
- Basic tree visualization
- Member CRUD with roles

### **Phase 2: User Experience** (4-6 weeks)  
- Interactive tree interface
- Mobile optimization
- Search and filtering
- Photo/document management

### **Phase 3: Advanced Features** (6-8 weeks)
- Multi-tree management
- Relationship analytics
- Family updates/news feed
- Advanced privacy controls

### **Phase 4: Collaboration & Integration** (8-10 weeks)
- External platform imports
- AI-powered features
- Advanced analytics
- Expert tools

This comprehensive design ensures that La Racine becomes a powerful, user-friendly family tree platform that respects privacy while encouraging family connection and historical preservation.
