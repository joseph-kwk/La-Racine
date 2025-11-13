from rest_framework import permissions

class IsOwnerOrStaff(permissions.BasePermission):
    """Allow access to staff, or to owners of the object.
    Ownership is inferred from common fields:
    - Tree: created_by
    - FamilyMember: tree.created_by
    - Update: member.tree.created_by
    - Notification: target_user
    - HistoryEvent: member.tree.created_by
    - UserProfile: user
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff:
            return True
        owner = None
        # Try common ownership paths
        if hasattr(obj, 'created_by'):
            owner = getattr(obj, 'created_by')
        elif hasattr(obj, 'tree') and hasattr(obj.tree, 'created_by'):
            owner = obj.tree.created_by
        elif hasattr(obj, 'member') and hasattr(obj.member, 'tree') and hasattr(obj.member.tree, 'created_by'):
            owner = obj.member.tree.created_by
        elif hasattr(obj, 'target_user'):
            owner = getattr(obj, 'target_user')
        elif hasattr(obj, 'user'):
            owner = getattr(obj, 'user')
        return owner == user


class RoleActionPermission(permissions.BasePermission):
    """Map roles (Viewer/Editor/Admin) to allowed HTTP methods.
    - Viewer: SAFE_METHODS only
    - Editor: SAFE_METHODS + POST + PUT + PATCH
    - Admin: SAFE_METHODS + POST + PUT + PATCH + DELETE
    Staff always allowed.
    If user has multiple roles, the most permissive applies.
    If user has no roles, default to Editor permissions for basic CRUD.
    """
    VIEWER = 'Viewer'
    EDITOR = 'Editor'
    ADMIN = 'Admin'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        method = request.method.upper()
        roles = set(g.name for g in getattr(user, 'groups', []).all())

        # Determine allowed set from roles
        allowed = set()
        if self.VIEWER in roles:
            allowed.update(permissions.SAFE_METHODS)
        if self.EDITOR in roles:
            allowed.update(permissions.SAFE_METHODS)
            allowed.update({'POST', 'PUT', 'PATCH'})
        if self.ADMIN in roles:
            allowed.update(permissions.SAFE_METHODS)
            allowed.update({'POST', 'PUT', 'PATCH', 'DELETE'})

        # If user has no role, default to Editor permissions (basic CRUD)
        if not allowed:
            allowed.update(permissions.SAFE_METHODS)
            allowed.update({'POST', 'PUT', 'PATCH'})

        return method in allowed
