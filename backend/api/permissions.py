from rest_framework.permissions import BasePermission


class IsCouncilAdmin(BasePermission):
    """Admins and Superusers can access."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_council_admin
        )


class IsSuperuser(BasePermission):
    """Only Superusers can access."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_superuser_role
        )


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_council_admin:
            return True
        return obj.reporter_user == request.user