from django.http import JsonResponse
from django.db import connection
from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import MaintenanceTicket
from .serializers import (
    RegisterSerializer, UserProfileSerializer,
    AdminUserSerializer, CreateAdminSerializer,
    TicketListSerializer, TicketDetailSerializer, TicketStatusSerializer,
)
from .permissions import IsCouncilAdmin, IsSuperuser, IsOwnerOrAdmin

User = get_user_model()


def hello_world(request):
    return JsonResponse({'message': 'Hello from the Django Backend!'})


def health_check(request):
    status_data = {
        'status': 'online',
        'database': 'disconnected',
        'storage': 'disconnected',
        'message': '',
    }
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        status_data['database'] = 'connected'
    except Exception as e:
        status_data['message'] += f'DB Error: {str(e)}. '

    try:
        default_storage.listdir('')
        status_data['storage'] = 'connected'
    except FileNotFoundError:
        status_data['storage'] = 'connected'
    except Exception as e:
        status_data['message'] += f'Storage Error: {str(e)}'

    if status_data['database'] == 'connected' and status_data['storage'] == 'connected':
        status_data['message'] = 'Backend and all services are fully operational'

    return JsonResponse(status_data, status=200)


# ── Auth ───────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserProfileSerializer(user).data, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ── Superuser: user management ─────────────────────────────────────────────────

class UserListView(generics.ListAPIView):
    """
    GET /api/superuser/users/
    List all users — superusers only.
    """
    queryset           = User.objects.all().order_by('-date_joined')
    serializer_class   = AdminUserSerializer
    permission_classes = [IsSuperuser]


class UserCreateView(generics.CreateAPIView):
    """
    POST /api/superuser/users/
    Create a new admin or superuser account — superusers only.
    """
    serializer_class   = CreateAdminSerializer
    permission_classes = [IsSuperuser]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/superuser/users/<id>/  — view any user
    PATCH  /api/superuser/users/<id>/  — update role / is_active
    DELETE /api/superuser/users/<id>/  — remove user
    Superusers only. A superuser cannot demote or delete themselves.
    """
    queryset           = User.objects.all()
    serializer_class   = AdminUserSerializer
    permission_classes = [IsSuperuser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        # Prevent a superuser from accidentally demoting themselves
        if instance == request.user and 'role' in request.data:
            if request.data['role'] != User.Role.SUPERUSER:
                return Response(
                    {'detail': 'You cannot change your own role.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ── Admin: ticket management ───────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """GET /api/admin/users/ — read-only user list for admins."""
    queryset           = User.objects.all().order_by('-date_joined')
    serializer_class   = AdminUserSerializer
    permission_classes = [IsCouncilAdmin]


# ── Tickets ────────────────────────────────────────────────────────────────────

class TicketListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        return TicketDetailSerializer if self.request.method == 'POST' else TicketListSerializer

    def get_queryset(self):
        qs     = MaintenanceTicket.objects.all()
        params = self.request.query_params
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('category'):
            qs = qs.filter(category=params['category'])
        if params.get('search'):
            qs = qs.filter(title__icontains=params['search'])
        return qs


class TicketDetailView(generics.RetrieveAPIView):
    queryset           = MaintenanceTicket.objects.all()
    serializer_class   = TicketDetailSerializer
    permission_classes = [AllowAny]


class TicketStatusUpdateView(generics.UpdateAPIView):
    queryset           = MaintenanceTicket.objects.all()
    serializer_class   = TicketStatusSerializer
    permission_classes = [IsCouncilAdmin]
    http_method_names  = ['patch']


class MyTicketsView(generics.ListAPIView):
    serializer_class   = TicketListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MaintenanceTicket.objects.filter(reporter_user=self.request.user)