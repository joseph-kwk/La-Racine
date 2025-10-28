# Frontend Architecture for La Racine Family Tree System

## 🏗️ Component Architecture Overview

### **App Structure**
```
src/
├── components/
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── AuthProvider.jsx
│   │
│   ├── tree/
│   │   ├── TreeDashboard.jsx
│   │   ├── TreeVisualization.jsx
│   │   ├── TreeSelector.jsx
│   │   ├── TreeSettings.jsx
│   │   └── TreeInvitations.jsx
│   │
│   ├── members/
│   │   ├── MemberList.jsx
│   │   ├── MemberCard.jsx
│   │   ├── MemberProfile.jsx
│   │   ├── MemberForm.jsx
│   │   ├── MemberSearch.jsx
│   │   └── RelationshipBuilder.jsx
│   │
│   ├── permissions/
│   │   ├── PermissionManager.jsx
│   │   ├── RoleSelector.jsx
│   │   ├── PrivacySettings.jsx
│   │   └── ConsentManager.jsx
│   │
│   ├── social/
│   │   ├── UpdatesFeed.jsx
│   │   ├── UpdateComposer.jsx
│   │   ├── UpdateCard.jsx
│   │   ├── PhotoGallery.jsx
│   │   └── CommentSection.jsx
│   │
│   ├── visualization/
│   │   ├── FamilyTreeChart.jsx
│   │   ├── TimelineView.jsx
│   │   ├── RelationshipMap.jsx
│   │   └── GenerationView.jsx
│   │
│   ├── common/
│   │   ├── Layout.jsx
│   │   ├── Navigation.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── Modal.jsx
│   │   └── ConfirmDialog.jsx
│   │
│   └── ui/
│       ├── Button.jsx
│       ├── Input.jsx
│       ├── Select.jsx
│       ├── DatePicker.jsx
│       ├── FileUpload.jsx
│       └── Avatar.jsx
│
├── hooks/
│   ├── useAuth.js
│   ├── useTree.js
│   ├── useMembers.js
│   ├── usePermissions.js
│   ├── useWebSocket.js
│   └── useNotifications.js
│
├── context/
│   ├── AuthContext.js
│   ├── TreeContext.js
│   ├── PermissionContext.js
│   └── NotificationContext.js
│
├── services/
│   ├── api.js
│   ├── auth.js
│   ├── tree.js
│   ├── members.js
│   ├── websocket.js
│   └── storage.js
│
├── utils/
│   ├── relationshipCalculator.js
│   ├── privacyHelper.js
│   ├── dateHelper.js
│   ├── validation.js
│   └── constants.js
│
└── styles/
    ├── index.css
    ├── components/
    ├── themes/
    └── responsive.css
```

---

## 🎭 User Role-Based Interface Components

### **Tree Owner/Administrator Dashboard**
```jsx
// components/dashboard/OwnerDashboard.jsx
import React from 'react';
import { useTree, usePermissions } from '../hooks';
import TreeStats from './TreeStats';
import PermissionManager from '../permissions/PermissionManager';
import RecentActivity from './RecentActivity';
import TreeSettings from '../tree/TreeSettings';

const OwnerDashboard = ({ treeId }) => {
  const { tree, loading } = useTree(treeId);
  const { permissions } = usePermissions(treeId);

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <h1>{tree.name} Management</h1>
        <div className="quick-actions">
          <button className="btn-primary">Add Member</button>
          <button className="btn-outline">Invite Family</button>
          <button className="btn-outline">Export Data</button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stats-section">
          <TreeStats tree={tree} />
        </div>
        
        <div className="permissions-section">
          <PermissionManager 
            treeId={treeId} 
            permissions={permissions}
            canManage={true}
          />
        </div>
        
        <div className="activity-section">
          <RecentActivity treeId={treeId} />
        </div>
        
        <div className="settings-section">
          <TreeSettings 
            tree={tree} 
            canEdit={true}
          />
        </div>
      </div>
    </div>
  );
};
```

### **Tree Editor Interface**
```jsx
// components/dashboard/EditorDashboard.jsx
import React, { useState } from 'react';
import MemberForm from '../members/MemberForm';
import RelationshipBuilder from '../members/RelationshipBuilder';
import UpdateComposer from '../social/UpdateComposer';
import PhotoUpload from '../social/PhotoUpload';

const EditorDashboard = ({ treeId, userRole }) => {
  const [activeTab, setActiveTab] = useState('members');

  const tabs = [
    { id: 'members', label: 'Family Members', icon: '👥' },
    { id: 'relationships', label: 'Relationships', icon: '🔗' },
    { id: 'updates', label: 'Family Updates', icon: '📰' },
    { id: 'photos', label: 'Photos', icon: '📸' },
  ];

  return (
    <div className="editor-dashboard">
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'members' && (
          <div className="members-editor">
            <MemberForm treeId={treeId} />
          </div>
        )}
        
        {activeTab === 'relationships' && (
          <div className="relationships-editor">
            <RelationshipBuilder treeId={treeId} />
          </div>
        )}
        
        {activeTab === 'updates' && (
          <div className="updates-editor">
            <UpdateComposer treeId={treeId} />
          </div>
        )}
        
        {activeTab === 'photos' && (
          <div className="photos-editor">
            <PhotoUpload treeId={treeId} />
          </div>
        )}
      </div>
    </div>
  );
};
```

### **Tree Viewer Interface**
```jsx
// components/dashboard/ViewerDashboard.jsx
import React, { useState } from 'react';
import FamilyTreeChart from '../visualization/FamilyTreeChart';
import MemberSearch from '../members/MemberSearch';
import UpdatesFeed from '../social/UpdatesFeed';
import PhotoGallery from '../social/PhotoGallery';

const ViewerDashboard = ({ treeId, userRole }) => {
  const [view, setView] = useState('tree');

  return (
    <div className="viewer-dashboard">
      <div className="viewer-header">
        <div className="view-switcher">
          <button 
            className={`view-btn ${view === 'tree' ? 'active' : ''}`}
            onClick={() => setView('tree')}
          >
            🌳 Family Tree
          </button>
          <button 
            className={`view-btn ${view === 'search' ? 'active' : ''}`}
            onClick={() => setView('search')}
          >
            🔍 Search Members
          </button>
          <button 
            className={`view-btn ${view === 'updates' ? 'active' : ''}`}
            onClick={() => setView('updates')}
          >
            📰 Family News
          </button>
          <button 
            className={`view-btn ${view === 'photos' ? 'active' : ''}`}
            onClick={() => setView('photos')}
          >
            📸 Photos
          </button>
        </div>
      </div>

      <div className="viewer-content">
        {view === 'tree' && (
          <FamilyTreeChart 
            treeId={treeId} 
            interactive={true}
            showPrivacyFilters={true}
          />
        )}
        
        {view === 'search' && (
          <MemberSearch 
            treeId={treeId}
            canEdit={false}
          />
        )}
        
        {view === 'updates' && (
          <UpdatesFeed 
            treeId={treeId}
            canPost={false}
          />
        )}
        
        {view === 'photos' && (
          <PhotoGallery 
            treeId={treeId}
            canUpload={false}
          />
        )}
      </div>
    </div>
  );
};
```

---

## 🔐 Permission-Aware Components

### **Smart Member Profile Component**
```jsx
// components/members/MemberProfile.jsx
import React from 'react';
import { usePermissions } from '../hooks';
import PrivacyBadge from '../ui/PrivacyBadge';
import EditButton from '../ui/EditButton';

const MemberProfile = ({ member, treeId }) => {
  const { userRole, canEdit, canView } = usePermissions(treeId);
  
  // Privacy-aware field rendering
  const renderField = (value, privacyLevel, label) => {
    if (!canView(privacyLevel)) {
      return (
        <div className="private-field">
          <span className="field-label">{label}:</span>
          <span className="private-indicator">🔒 Private</span>
        </div>
      );
    }
    
    return (
      <div className="field">
        <span className="field-label">{label}:</span>
        <span className="field-value">{value}</span>
        <PrivacyBadge level={privacyLevel} />
      </div>
    );
  };

  return (
    <div className="member-profile">
      <div className="profile-header">
        <div className="profile-photo">
          {canView(member.privacy_settings.photos_level) ? (
            <img src={member.profile_photo} alt={member.display_name} />
          ) : (
            <div className="private-photo">🔒</div>
          )}
        </div>
        
        <div className="profile-info">
          <h2>{member.display_name}</h2>
          {canEdit(member) && (
            <EditButton onClick={() => editMember(member.id)} />
          )}
        </div>
      </div>

      <div className="profile-details">
        {renderField(
          member.birth_date, 
          member.privacy_settings.birth_date_level, 
          'Birth Date'
        )}
        
        {renderField(
          member.current_location, 
          member.privacy_settings.location_level, 
          'Location'
        )}
        
        {renderField(
          member.occupation, 
          member.privacy_settings.basic_info_level, 
          'Occupation'
        )}
        
        {renderField(
          member.biography, 
          member.privacy_settings.biography_level, 
          'Biography'
        )}
      </div>

      <div className="profile-relationships">
        <RelationshipList 
          memberId={member.id} 
          canEdit={canEdit(member)}
        />
      </div>
    </div>
  );
};
```

### **Dynamic Tree Visualization**
```jsx
// components/visualization/FamilyTreeChart.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTree, usePermissions } from '../hooks';

const FamilyTreeChart = ({ treeId, focusMemberId = null }) => {
  const svgRef = useRef();
  const [selectedMember, setSelectedMember] = useState(null);
  const { members, relationships } = useTree(treeId);
  const { canView, userRole } = usePermissions(treeId);

  useEffect(() => {
    if (!members.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Filter members based on privacy settings
    const visibleMembers = members.filter(member => 
      canView(member.privacy_settings.basic_info_level)
    );

    // Create hierarchical layout
    const root = d3.hierarchy(buildTreeData(visibleMembers, relationships));
    const treeLayout = d3.tree().size([800, 600]);
    treeLayout(root);

    // Draw connections
    svg.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x)
      );

    // Draw member nodes
    const nodes = svg.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .on('click', (event, d) => setSelectedMember(d.data));

    // Add member photos/avatars
    nodes.append('circle')
      .attr('r', 30)
      .attr('class', d => `member-node ${d.data.gender}`);

    // Add member names
    nodes.append('text')
      .attr('dy', 45)
      .attr('text-anchor', 'middle')
      .text(d => d.data.display_name);

    // Add privacy indicators
    nodes.filter(d => d.data.has_private_info)
      .append('text')
      .attr('class', 'privacy-indicator')
      .attr('x', 20)
      .attr('y', -20)
      .text('🔒');

  }, [members, relationships, canView]);

  return (
    <div className="family-tree-chart">
      <div className="chart-controls">
        <button onClick={() => zoomToFit()}>Fit to Screen</button>
        <button onClick={() => resetZoom()}>Reset Zoom</button>
        <select onChange={(e) => setFocusMember(e.target.value)}>
          <option value="">Focus on Member...</option>
          {members.map(member => (
            <option key={member.id} value={member.id}>
              {member.display_name}
            </option>
          ))}
        </select>
      </div>

      <svg 
        ref={svgRef} 
        width="100%" 
        height="600"
        className="tree-svg"
      />

      {selectedMember && (
        <MemberPopover 
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
};
```

### **Multi-Tree Management Interface**
```jsx
// components/tree/MultiTreeManager.jsx
import React, { useState } from 'react';
import { useUserTrees } from '../hooks';
import TreeCard from './TreeCard';
import TreeCreationWizard from './TreeCreationWizard';

const MultiTreeManager = () => {
  const { trees, loading } = useUserTrees();
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedTreeType, setSelectedTreeType] = useState('primary');

  const treeTypeOptions = [
    { value: 'primary', label: 'Primary Family', icon: '🏠', description: 'Main nuclear family tree' },
    { value: 'maternal', label: 'Maternal Line', icon: '👩', description: "Mother's side ancestry" },
    { value: 'paternal', label: 'Paternal Line', icon: '👨', description: "Father's side ancestry" },
    { value: 'extended', label: 'Extended Family', icon: '👨‍👩‍👧‍👦', description: 'Cousins, aunts, uncles' },
    { value: 'adopted', label: 'Adopted Family', icon: '💝', description: 'Adopted family connections' },
    { value: 'step', label: 'Step Family', icon: '👫', description: 'Step-parent family lines' },
  ];

  return (
    <div className="multi-tree-manager">
      <div className="trees-header">
        <h2>Family Trees</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateWizard(true)}
        >
          + Create New Tree
        </button>
      </div>

      <div className="tree-type-selector">
        {treeTypeOptions.map(option => (
          <div 
            key={option.value}
            className={`tree-type-option ${selectedTreeType === option.value ? 'selected' : ''}`}
            onClick={() => setSelectedTreeType(option.value)}
          >
            <span className="tree-icon">{option.icon}</span>
            <h4>{option.label}</h4>
            <p>{option.description}</p>
          </div>
        ))}
      </div>

      <div className="trees-grid">
        {trees
          .filter(tree => tree.tree_type === selectedTreeType)
          .map(tree => (
            <TreeCard 
              key={tree.id} 
              tree={tree}
              showRole={true}
              showStats={true}
            />
          ))
        }
      </div>

      {showCreateWizard && (
        <TreeCreationWizard 
          treeType={selectedTreeType}
          onClose={() => setShowCreateWizard(false)}
          onSuccess={(newTree) => {
            setShowCreateWizard(false);
            // Navigate to new tree
          }}
        />
      )}
    </div>
  );
};
```

---

## 🎨 Responsive Design System

### **CSS Custom Properties**
```css
/* styles/themes/default.css */
:root {
  /* Tree visualization colors */
  --male-node-color: #4A90E2;
  --female-node-color: #E24A90;
  --other-node-color: #9B59B6;
  --deceased-node-color: #7F8C8D;
  
  /* Permission level colors */
  --owner-badge: #E74C3C;
  --editor-badge: #F39C12;
  --viewer-badge: #3498DB;
  --guest-badge: #95A5A6;
  
  /* Privacy level indicators */
  --public-privacy: #27AE60;
  --family-privacy: #F39C12;
  --private-privacy: #E74C3C;
  
  /* Tree type colors */
  --primary-tree: #2C3E50;
  --maternal-tree: #8E44AD;
  --paternal-tree: #2980B9;
  --extended-tree: #16A085;
  
  /* Relationship colors */
  --parent-child-line: #34495E;
  --spouse-line: #E74C3C;
  --sibling-line: #F39C12;
  --adoption-line: #9B59B6;
}
```

### **Responsive Tree Visualization**
```css
/* styles/components/tree-visualization.css */
.family-tree-chart {
  width: 100%;
  height: 100vh;
  position: relative;
}

.tree-svg {
  cursor: grab;
  background: radial-gradient(circle, #f8f9fa 0%, #e9ecef 100%);
}

.tree-svg:active {
  cursor: grabbing;
}

/* Member nodes */
.member-node {
  fill: var(--male-node-color);
  stroke: #fff;
  stroke-width: 3;
  cursor: pointer;
  transition: all 0.3s ease;
}

.member-node.female {
  fill: var(--female-node-color);
}

.member-node.other {
  fill: var(--other-node-color);
}

.member-node.deceased {
  fill: var(--deceased-node-color);
  opacity: 0.7;
}

.member-node:hover {
  stroke-width: 5;
  filter: brightness(1.1);
}

/* Relationship lines */
.link {
  fill: none;
  stroke: var(--parent-child-line);
  stroke-width: 2;
}

.link.spouse {
  stroke: var(--spouse-line);
  stroke-dasharray: 5,5;
}

.link.adoption {
  stroke: var(--adoption-line);
  stroke-dasharray: 10,5;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .family-tree-chart {
    height: 70vh;
  }
  
  .member-node {
    r: 20;
  }
  
  .chart-controls {
    flex-direction: column;
    gap: 0.5rem;
  }
}

/* Touch devices */
@media (hover: none) {
  .member-node:hover {
    stroke-width: 3;
  }
  
  .member-node:active {
    stroke-width: 5;
    filter: brightness(1.1);
  }
}
```

---

## 🔄 State Management with Context

### **Tree Context Provider**
```jsx
// context/TreeContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { treeAPI } from '../services/api';

const TreeContext = createContext();

const treeReducer = (state, action) => {
  switch (action.type) {
    case 'SET_TREES':
      return { ...state, trees: action.payload, loading: false };
    
    case 'SET_CURRENT_TREE':
      return { ...state, currentTree: action.payload };
    
    case 'ADD_MEMBER':
      return {
        ...state,
        currentTree: {
          ...state.currentTree,
          members: [...state.currentTree.members, action.payload]
        }
      };
    
    case 'UPDATE_MEMBER':
      return {
        ...state,
        currentTree: {
          ...state.currentTree,
          members: state.currentTree.members.map(member =>
            member.id === action.payload.id ? action.payload : member
          )
        }
      };
    
    case 'ADD_RELATIONSHIP':
      return {
        ...state,
        currentTree: {
          ...state.currentTree,
          relationships: [...state.currentTree.relationships, action.payload]
        }
      };
    
    default:
      return state;
  }
};

export const TreeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(treeReducer, {
    trees: [],
    currentTree: null,
    loading: true,
    error: null
  });

  const selectTree = async (treeId) => {
    try {
      const treeData = await treeAPI.getTreeWithMembers(treeId);
      dispatch({ type: 'SET_CURRENT_TREE', payload: treeData });
    } catch (error) {
      console.error('Failed to load tree:', error);
    }
  };

  const addMember = async (memberData) => {
    try {
      const newMember = await treeAPI.addMember(state.currentTree.id, memberData);
      dispatch({ type: 'ADD_MEMBER', payload: newMember });
      return newMember;
    } catch (error) {
      console.error('Failed to add member:', error);
      throw error;
    }
  };

  const value = {
    ...state,
    selectTree,
    addMember,
    // ... other actions
  };

  return (
    <TreeContext.Provider value={value}>
      {children}
    </TreeContext.Provider>
  );
};

export const useTree = () => {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error('useTree must be used within TreeProvider');
  }
  return context;
};
```

This comprehensive frontend architecture provides a scalable, maintainable foundation for the La Racine family tree system, with role-based interfaces, privacy-aware components, and responsive design that works across all devices and user types.
