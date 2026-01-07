import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from '@xyflow/react';
import { Tooltip } from 'react-tooltip';
import { useTranslation } from 'react-i18next';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';

const FAMILY_COLORS = [
  { primary: '#3b82f6', light: '#dbeafe', name: 'Blue' },
  { primary: '#10b981', light: '#d1fae5', name: 'Green' },
  { primary: '#f59e0b', light: '#fef3c7', name: 'Amber' },
  { primary: '#8b5cf6', light: '#ede9fe', name: 'Purple' },
  { primary: '#ec4899', light: '#fce7f3', name: 'Pink' },
  { primary: '#06b6d4', light: '#cffafe', name: 'Cyan' },
  { primary: '#ef4444', light: '#fee2e2', name: 'Red' },
  { primary: '#14b8a6', light: '#ccfbf1', name: 'Teal' },
];

const FamilyMemberNode = ({ data }) => {
  const { member, onMemberClick, branchColor } = data;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).getFullYear();
  };

  const getAge = () => {
    if (!member.birth_date) return '';
    const birth = new Date(member.birth_date);
    const death = member.death_date ? new Date(member.death_date) : new Date();
    const age = death.getFullYear() - birth.getFullYear();
    return member.death_date ? ` (${age})` : ` (${age})`;
  };

  const getBorderColor = () => {
    if (branchColor) return branchColor.primary;
    return member.gender === 'male' ? '#3b82f6' : member.gender === 'female' ? '#ec4899' : '#6b7280';
  };

  const getBackgroundColor = () => {
    if (member.photo) return 'transparent';
    if (branchColor) return branchColor.light;
    return member.gender === 'male' ? '#dbeafe' : member.gender === 'female' ? '#fce7f3' : '#f3f4f6';
  };

  const getInitialsColor = () => {
    if (branchColor) return branchColor.primary;
    return member.gender === 'male' ? '#3b82f6' : member.gender === 'female' ? '#ec4899' : '#6b7280';
  };

  return (
    <div
      className={`family-member-node ${member.gender || 'other'}`}
      onClick={() => onMemberClick(member)}
      data-tooltip-id={`member-tooltip-${member.id}`}
      data-tooltip-content={`${member.first_name} ${member.last_name}${member.nickname ? ` "${member.nickname}"` : ''}`}
      style={{
        padding: '12px',
        borderRadius: '50%',
        width: '140px',
        height: '140px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: '3px solid',
        borderColor: getBorderColor(),
        backgroundColor: getBackgroundColor(),
        boxShadow: branchColor 
          ? `0 4px 6px -1px ${branchColor.primary}40` 
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = branchColor
          ? `0 10px 15px -3px ${branchColor.primary}60`
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = branchColor
          ? `0 4px 6px -1px ${branchColor.primary}40`
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }}
    >
      {member.photo ? (
        <img
          src={member.photo}
          alt={`${member.first_name} ${member.last_name}`}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: getInitialsColor(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
          }}
        >
          {member.first_name[0]}{member.last_name[0]}
        </div>
      )}
      <div
        style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: '600',
          color: '#374151',
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.first_name} {member.last_name}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: '#6b7280',
          marginTop: '2px',
        }}
      >
        {formatDate(member.birth_date)} - {formatDate(member.death_date) || 'Present'}{getAge()}
      </div>
      {member.nickname && (
        <div
          style={{
            fontSize: '10px',
            color: '#9ca3af',
            fontStyle: 'italic',
            marginTop: '2px',
          }}
        >
          "{member.nickname}"
        </div>
      )}
      {!member.is_alive && (
        <div
          style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          †
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  familyMember: FamilyMemberNode,
};

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 140;
  const nodeHeight = 140;

  dagreGraph.setGraph({ rankdir: direction, ranksep: 150, nodesep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const findRoots = (members) => {
  return members.filter(m => !m.parent_ids || m.parent_ids.length === 0);
};

const buildFamilyBranches = (members) => {
  const roots = findRoots(members);
  const branches = [];
  const memberMap = new Map(members.map(m => [m.id, m]));
  const visited = new Set();

  const traverseBranch = (memberId, branchMembers = []) => {
    if (visited.has(memberId)) return branchMembers;
    visited.add(memberId);

    const member = memberMap.get(memberId);
    if (!member) return branchMembers;

    branchMembers.push(member);

    members.forEach(m => {
      if (m.parent_ids && m.parent_ids.includes(memberId)) {
        traverseBranch(m.id, branchMembers);
      }
    });

    if (member.spouse && !visited.has(member.spouse)) {
      traverseBranch(member.spouse, branchMembers);
    }

    return branchMembers;
  };

  roots.forEach(root => {
    const branchMembers = traverseBranch(root.id);
    if (branchMembers.length > 0) {
      branches.push(branchMembers);
    }
  });

  const orphans = members.filter(m => !visited.has(m.id));
  if (orphans.length > 0) {
    branches.push(orphans);
  }

  return branches;
};

const FamilyTree = ({ members, onMemberClick }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('normal');

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const memberMap = new Map(members.map(m => [m.id, m]));

    let branchColorMap = new Map();
    if (viewMode === 'hierarchical') {
      const branches = buildFamilyBranches(members);
      branches.forEach((branch, index) => {
        const color = FAMILY_COLORS[index % FAMILY_COLORS.length];
        branch.forEach(member => {
          branchColorMap.set(member.id, color);
        });
      });
    }

    members.forEach((member, index) => {
      const x = (index % 5) * 200 + 100;
      const y = Math.floor(index / 5) * 200 + 100;

      const branchColor = branchColorMap.get(member.id);

      nodes.push({
        id: member.id.toString(),
        type: 'familyMember',
        position: { x, y },
        data: { member, onMemberClick, branchColor },
      });

      if (member.parent_ids && member.parent_ids.length > 0) {
        member.parent_ids.forEach(parentId => {
          if (memberMap.has(parentId)) {
            const parentColor = branchColorMap.get(parentId);
            edges.push({
              id: `edge-${parentId}-${member.id}`,
              source: parentId.toString(),
              target: member.id.toString(),
              type: 'smoothstep',
              style: { 
                stroke: parentColor ? parentColor.primary : '#6b7280', 
                strokeWidth: viewMode === 'hierarchical' ? 3 : 2 
              },
              animated: viewMode === 'hierarchical',
            });
          }
        });
      }

      if (member.spouse && memberMap.has(member.spouse)) {
        const spouseId = member.spouse;
        if (parseInt(member.id) < parseInt(spouseId)) {
          const spouseColor = branchColorMap.get(member.id);
          edges.push({
            id: `spouse-${member.id}-${spouseId}`,
            source: member.id.toString(),
            target: spouseId.toString(),
            type: 'smoothstep',
            style: { 
              stroke: spouseColor ? spouseColor.primary : '#ec4899', 
              strokeWidth: 2, 
              strokeDasharray: '5,5' 
            },
          });
        }
      }
    });

    return getLayoutedElements(nodes, edges, 'TB');
  }, [members, onMemberClick, viewMode]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'normal' ? 'hierarchical' : 'normal');
  };

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="top-right"
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        
        <Panel position="top-left">
          <div style={{ background: 'white', padding: '8px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <button
              onClick={toggleViewMode}
              style={{
                padding: '8px 16px',
                background: viewMode === 'hierarchical' ? '#3b82f6' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {viewMode === 'normal' ? t('visualization.hierarchicalView') : t('visualization.normalView')}
            </button>
            {viewMode === 'hierarchical' && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                {t('visualization.differentColorsBranches')}
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
      
      {members.map(member => (
        <Tooltip
          key={member.id}
          id={`member-tooltip-${member.id}`}
          place="top"
          style={{ maxWidth: '300px', fontSize: '12px', zIndex: 9999 }}
        >
          <div>
            <strong>{member.first_name} {member.last_name}</strong>
            {member.nickname && <div>"{member.nickname}"</div>}
            <div>Gender: {member.gender || 'Not specified'}</div>
            {member.birth_date && <div>Born: {new Date(member.birth_date).toLocaleDateString()}</div>}
            {member.death_date && <div>Died: {new Date(member.death_date).toLocaleDateString()}</div>}
            {member.location && <div>Location: {member.location}</div>}
            {member.relationship && <div>Relationship: {member.relationship}</div>}
            {member.notes && <div>Notes: {member.notes}</div>}
          </div>
        </Tooltip>
      ))}
    </div>
  );
};

export default FamilyTree;
