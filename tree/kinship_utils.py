"""
tree/kinship_utils.py — Kinship Distance & Relationship Resolution Engine

Calculates graph distance and degrees of relationship between a focus member
(e.g., the logged-in user's profile) and all other members in a family tree.
Provides gender-aware natural relationship labels (Mother, Father, Sister, Brother, etc.).
"""

from collections import deque
from .models import FamilyMember, FamilyRelationship


def resolve_user_member(user, tree):
    """
    Finds the FamilyMember in a tree linked to the logged-in User.
    Fallback: returns the tree's root or first member if user is not explicitly linked.
    """
    if not user or not user.is_authenticated:
        return FamilyMember.objects.filter(tree=tree).first()

    # 1. Direct user link on FamilyMember
    member = FamilyMember.objects.filter(tree=tree, user_account=user).first()
    if member:
        return member

    # 2. Fallback to tree's primary/first member
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
    member_by_id = {m.id: m for m in members}
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
                target_member = member_by_id.get(neighbor_id)
                target_gender = getattr(target_member, 'gender', 'other')

                # Determine scope level & gender-aware relationship label
                scope, label = _classify_relationship(dist + 1, new_path, target_gender)
                kinship_map[neighbor_id] = {'scope': scope, 'label': label}

                if dist + 1 < 4: # Traverse up to 4 hops
                    queue.append((neighbor_id, dist + 1, new_path))

    return kinship_map


def _classify_relationship(dist, path, gender='other'):
    """Classifies a relationship path into a scope tier and gender-aware label."""
    is_female = (gender == 'female')
    is_male = (gender == 'male')

    if dist == 1:
        rel_type, is_forward = path[0]
        if rel_type == 'spouse':
            if is_female: return 'immediate', 'Wife'
            if is_male: return 'immediate', 'Husband'
            return 'immediate', 'Spouse'
        elif rel_type == 'parent':
            if is_forward:
                if is_female: return 'immediate', 'Mother'
                if is_male: return 'immediate', 'Father'
                return 'immediate', 'Parent'
            else:
                if is_female: return 'immediate', 'Daughter'
                if is_male: return 'immediate', 'Son'
                return 'immediate', 'Child'
        elif rel_type == 'child':
            if is_forward:
                if is_female: return 'immediate', 'Daughter'
                if is_male: return 'immediate', 'Son'
                return 'immediate', 'Child'
            else:
                if is_female: return 'immediate', 'Mother'
                if is_male: return 'immediate', 'Father'
                return 'immediate', 'Parent'
        elif rel_type == 'sibling':
            if is_female: return 'immediate', 'Sister'
            if is_male: return 'immediate', 'Brother'
            return 'immediate', 'Sibling'

    elif dist == 2:
        r1, r2 = path[0][0], path[1][0]
        if r1 == 'parent' and r2 == 'parent':
            if is_female: return 'lineal', 'Grandmother'
            if is_male: return 'lineal', 'Grandfather'
            return 'lineal', 'Grandparent'
        elif r1 == 'child' and r2 == 'child':
            if is_female: return 'lineal', 'Granddaughter'
            if is_male: return 'lineal', 'Grandson'
            return 'lineal', 'Grandchild'
        elif r1 == 'parent' and r2 == 'sibling':
            if is_female: return 'extended', 'Aunt'
            if is_male: return 'extended', 'Uncle'
            return 'extended', 'Aunt / Uncle'
        elif r1 == 'sibling' and r2 == 'child':
            if is_female: return 'extended', 'Niece'
            if is_male: return 'extended', 'Nephew'
            return 'extended', 'Niece / Nephew'
        elif r1 == 'spouse' and r2 in ['parent', 'sibling', 'child']:
            return 'extended', 'In-Law'

    elif dist == 3:
        if path[0][0] == 'parent' and path[1][0] == 'parent' and path[2][0] == 'parent':
            if is_female: return 'lineal', 'Great-Grandmother'
            if is_male: return 'lineal', 'Great-Grandfather'
            return 'lineal', 'Great-Grandparent'
        elif path[0][0] == 'parent' and path[1][0] == 'sibling' and path[2][0] == 'child':
            return 'extended', 'First Cousin'

    # Fallback default for larger distances
    if dist <= 2:
        return 'extended', 'Relative'
    return 'all', 'Family Member'
