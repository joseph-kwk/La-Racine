import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom node component for family members
const FamilyMemberNode = ({ data }) => {
  const { member, onMemberClick } = data;

  return (
    <div
      className={`family-member-node ${member.gender || 'other'}`}
      onClick={() => onMemberClick(member)}
      style={{
        padding: '12px',
        borderRadius: '50%',
        width: '120px',
        height: '120px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: '3px solid',
        borderColor: member.gender === 'male' ? '#3b82f6' : member.gender === 'female' ? '#ec4899' : '#6b7280',
        backgroundColor: member.photo ? 'transparent' : (member.gender === 'male' ? '#dbeafe' : member.gender === 'female' ? '#fce7f3' : '#f3f4f6'),
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease-in-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
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
            backgroundColor: member.gender === 'male' ? '#3b82f6' : member.gender === 'female' ? '#ec4899' : '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
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
          maxWidth: '100px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {member.first_name}
        <br />
        {member.last_name}
      </div>
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

const FamilyTree = ({ members, onMemberClick }) => {
  // Build nodes and edges from members
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const memberMap = new Map(members.map(m => [m.id, m]));

    // Simple layout: place nodes in a grid for now
    // TODO: Implement proper tree layout
    members.forEach((member, index) => {
      const x = (index % 5) * 200 + 100;
      const y = Math.floor(index / 5) * 200 + 100;

      nodes.push({
        id: member.id.toString(),
        type: 'familyMember',
        position: { x, y },
        data: { member, onMemberClick },
      });

      // Add edges for parents
      if (member.parent_ids && member.parent_ids.length > 0) {
        member.parent_ids.forEach(parentId => {
          if (memberMap.has(parentId)) {
            edges.push({
              id: `edge-${parentId}-${member.id}`,
              source: parentId.toString(),
              target: member.id.toString(),
              type: 'smoothstep',
              style: { stroke: '#6b7280', strokeWidth: 2 },
            });
          }
        });
      }

      // Add edges for spouses
      if (member.spouse && memberMap.has(member.spouse)) {
        const spouseId = member.spouse;
        // Avoid duplicate edges
        if (parseInt(member.id) < parseInt(spouseId)) {
          edges.push({
            id: `spouse-${member.id}-${spouseId}`,
            source: member.id.toString(),
            target: spouseId.toString(),
            type: 'smoothstep',
            style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '5,5' },
          });
        }
      }
    });

    return { nodes, edges };
  }, [members, onMemberClick]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100%', height: '600px' }}>
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
      </ReactFlow>
    </div>
  );
};

export default FamilyTree;