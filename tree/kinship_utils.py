"""
tree/kinship_utils.py — Kinship Distance & Relationship Resolution Engine

Calculates graph distance and degrees of relationship between a focus member
(e.g., the logged-in user's profile) and all other members in a family tree.
"""

from collections import deque
from .models import FamilyMember, FamilyRelationship


def resolve_user_member(user, tree):
    """
    Finds the FamilyMember in a tree linked to the logged-in User.
    Fallback: returns the tree's root or first member if user is not explicitly linked.
    """
    # 1. Direct user link on FamilyMember
    member = FamilyMember.objects.filter(tree=tree, user_account=user).first()
    if member:
        return member

    # 2. Check profile or email match
    if user.email:
        member_email = FamilyMember.objects.filter(tree=tree, email__iexact=user.email).first()
        if member_email:
            return member_email

    # 3. Fallback to tree's primary/first member
    return FamilyMember.objects.filter(tree=tree).first()


def compute_kinship_map(focus_member):
    """
    Computes a mapping of member_id -> { 'scope': 'immediate'|'lineal'|'extended'|'all', 'label': str }
    from the perspective of focus_member.
    """
    if not focus_member:
        return {}

    tree = focus_member.tree
    members = list(FamilyMember.objects.filter(tree=tree))
    relationships = list(FamilyRelationship.objects.filter(from_member__tree=tree))

    # Build adjacency list: member_id -> list of (neighbor_id, rel_type, is_forward)
    adj = {m.id: [] for m in members}
    for rel in relationships:
        adj[rel.from_member_id].append((rel.to_member_id, rel.relationship_type, True))
        # Inverse relationship
        adj[rel.to_member_id].append((rel.from_member_id, rel.relationship_type, False))

    kinship_map = {
        focus_member.id: {'scope': 'immediate', 'label': 'Self'}
    }

    # BFS Traversal to calculate shortest distance
    queue = deque([(focus_member.id, 0, [])]) # (current_id, distance, path_rel_types)
    visited = {focus_member.id: 0}

    while queue:
        curr_id, dist, path = queue.popleft()

        for neighbor_id, rel_type, is_forward in adj.get(curr_id, []):
            if neighbor_id not in visited:
                visited[neighbor_id] = dist + 1
                new_path = path + [(rel_type, is_forward)]

                # Determine scope level & relationship label
                scope, label = _classify_relationship(dist + 1, new_path)
                kinship_map[neighbor_id] = {'scope': scope, 'label': label}

                if dist + 1 < 4: # Traverse up to 4 hops
                    queue.append((neighbor_id, dist + 1, new_path))

    return kinship_map


def _classify_relationship(dist, path):
    """Classifies a relationship path into a scope tier and human-readable label."""
    if dist == 1:
        rel_type, is_forward = path[0]
        if rel_type == 'spouse':
            return 'immediate', 'Spouse'
        elif rel_type == 'parent':
            return 'immediate', 'Parent' if is_forward else 'Child'
        elif rel_type == 'child':
            return 'immediate', 'Child' if is_forward else 'Parent'
        elif rel_type == 'sibling':
            return 'immediate', 'Sibling'

    elif dist == 2:
        r1, r2 = path[0][0], path[1][0]
        if r1 == 'parent' and r2 == 'parent':
            return 'lineal', 'Grandparent'
        elif r1 == 'child' and r2 == 'child':
            return 'lineal', 'Grandchild'
        elif r1 == 'parent' and r2 == 'sibling':
            return 'extended', 'Aunt / Uncle'
        elif r1 == 'sibling' and r2 == 'child':
            return 'extended', 'Niece / Nephew'
        elif r1 == 'spouse' and r2 in ['parent', 'sibling', 'child']:
            return 'extended', 'In-Law'

    elif dist == 3:
        if path[0][0] == 'parent' and path[1][0] == 'parent' and path[2][0] == 'parent':
            return 'lineal', 'Great-Grandparent'
        elif path[0][0] == 'parent' and path[1][0] == 'sibling' and path[2][0] == 'child':
            return 'extended', 'First Cousin'

    # Fallback default for larger distances
    if dist <= 2:
        return 'extended', 'Relative'
    return 'all', 'Family Member'
