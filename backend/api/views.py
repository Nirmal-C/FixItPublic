import requests as http_requests
from django.http import JsonResponse, HttpResponse
from django.db import connection
from django.db.models import Q
from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from django.utils import timezone
from .models import MaintenanceTicket, CATEGORY_CREW_MAP
from .serializers import (
    RegisterSerializer, UserProfileSerializer,
    AdminUserSerializer, CreateAdminSerializer,
    TicketListSerializer, TicketDetailSerializer,
    TicketStatusSerializer, TicketAssignSerializer,
)
from .permissions import IsCouncilAdmin, IsSuperuser

User = get_user_model()


# ── Utilities ──────────────────────────────────────────────────────────────────

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


# ── Photo proxy ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def serve_photo(request, path):
    """
    GET /api/photos/<path>/
    Proxies ticket photos through Django so the frontend never calls
    Azure directly. Django generates a fresh signed SAS URL internally,
    fetches the blob, and streams the bytes back to the browser.
    The Azure container stays private at all times.
    """
    # Try the full multi-field query first. If migration 0006 hasn't been
    # applied yet (photo2–photo5 columns don't exist), fall back to the
    # original single-field query so existing photos keep working.
    try:
        ticket = MaintenanceTicket.objects.filter(
            Q(photo=path) | Q(photo2=path) | Q(photo3=path) | Q(photo4=path) | Q(photo5=path)
        ).first()
    except Exception:
        ticket = MaintenanceTicket.objects.filter(photo=path).first()

    if not ticket:
        return Response({'detail': 'Not found.'}, status=404)

    # Find which of the five fields actually holds this path.
    # Fall back gracefully if extra columns don't exist yet.
    photo_field = None
    for field_name in ('photo', 'photo2', 'photo3', 'photo4', 'photo5'):
        try:
            field = getattr(ticket, field_name)
            if field and field.name == path:
                photo_field = field
                break
        except Exception:
            continue
    if not photo_field:
        return Response({'detail': 'Not found.'}, status=404)

    sas_url = photo_field.url
    try:
        resp = http_requests.get(sas_url, timeout=10)
    except Exception:
        return Response({'detail': 'Could not retrieve photo.'}, status=502)
    if resp.status_code != 200:
        return Response({'detail': 'Could not retrieve photo.'}, status=502)

    return HttpResponse(
        resp.content,
        content_type=resp.headers.get('Content-Type', 'image/jpeg'),
    )


# ── Pagination ─────────────────────────────────────────────────────────────────

class TicketPagination(PageNumberPagination):
    page_size             = 9
    page_size_query_param = 'page_size'
    max_page_size         = 1000


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
    queryset           = User.objects.all().order_by('-date_joined')
    serializer_class   = AdminUserSerializer
    permission_classes = [IsSuperuser]


class UserCreateView(generics.CreateAPIView):
    serializer_class   = CreateAdminSerializer
    permission_classes = [IsSuperuser]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
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
        if instance == request.user and 'role' in request.data:
            if request.data['role'] != User.Role.SUPERUSER:
                return Response(
                    {'detail': 'You cannot change your own role.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ── Admin: read-only user list ─────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    queryset           = User.objects.all().order_by('-date_joined')
    serializer_class   = AdminUserSerializer
    permission_classes = [IsCouncilAdmin]


# ── Tickets ────────────────────────────────────────────────────────────────────

class TicketListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    pagination_class   = TicketPagination

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
            term = params['search']
            qs = qs.filter(
                Q(title__icontains=term) |
                Q(location_description__icontains=term)
            )

        return qs

    def perform_create(self, serializer):
        """Auto-assign crew based on category when a ticket is first created."""
        category = self.request.data.get('category', 'other')
        auto_crew = CATEGORY_CREW_MAP.get(category, 'crew-echo')
        serializer.save(assigned_crew=auto_crew)


class TicketDetailView(generics.RetrieveAPIView):
    queryset           = MaintenanceTicket.objects.all()
    serializer_class   = TicketDetailSerializer
    permission_classes = [AllowAny]


class TicketStatusUpdateView(generics.UpdateAPIView):
    queryset           = MaintenanceTicket.objects.all()
    serializer_class   = TicketStatusSerializer
    permission_classes = [IsCouncilAdmin]
    http_method_names  = ['patch']


class TicketAssignView(generics.UpdateAPIView):
    """
    PATCH /api/requests/<id>/assign/
    Admin can update crew assignment and/or escalate a ticket.
    When escalating, records who escalated and when.
    """
    queryset           = MaintenanceTicket.objects.all()
    serializer_class   = TicketAssignSerializer
    permission_classes = [IsCouncilAdmin]
    http_method_names  = ['patch']

    def perform_update(self, serializer):
        data = serializer.validated_data
        extra = {}
        # If escalation is being set to True, stamp who escalated and when
        if data.get('escalated') and not serializer.instance.escalated:
            extra['escalated_at'] = timezone.now()
            extra['escalated_by'] = self.request.user
        # If escalation is being cleared, wipe the escalation metadata
        elif not data.get('escalated', True):
            extra['escalated_at']     = None
            extra['escalated_by']     = None
            extra['escalation_level'] = ''
            extra['escalation_note']  = ''
        serializer.save(**extra)


class MyTicketsView(generics.ListAPIView):
    serializer_class   = TicketListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class   = TicketPagination

    def get_queryset(self):
        return MaintenanceTicket.objects.filter(reporter_user=self.request.user)