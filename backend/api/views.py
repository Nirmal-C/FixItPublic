import requests as http_requests
from django.http import JsonResponse, HttpResponse
from django.db import connection
from django.db.models import Q, Count
from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import AnonRateThrottle

from .models import MaintenanceTicket, CATEGORY_CREW_MAP
from .serializers import (
    RegisterSerializer, UserProfileSerializer,
    AdminUserSerializer, CreateAdminSerializer,
    TicketListSerializer, TicketDetailSerializer,
    TicketStatusSerializer, TicketAssignSerializer,
    MapTicketSerializer,
)
from .permissions import IsCouncilAdmin, IsSuperuser
from .emails import (
    send_welcome_email,
    send_ticket_confirmation,
    send_ticket_status_update,
    send_signin_notification,
)

User = get_user_model()


# ── Throttle classes ────────────────────────────────────────────────────────────

class TicketCreateThrottle(AnonRateThrottle):
    """10 ticket submissions per hour per IP for unauthenticated users."""
    rate  = '10/hour'
    scope = 'ticket_create'


class RegisterThrottle(AnonRateThrottle):
    """5 registrations per hour per IP — prevents spam accounts."""
    rate  = '5/hour'
    scope = 'register'


class LoginThrottle(AnonRateThrottle):
    """10 login attempts per hour per IP."""
    rate  = '10/hour'
    scope = 'login'


# ── Utilities ───────────────────────────────────────────────────────────────────

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


# ── Photo proxy ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def serve_photo(request, path):
    """
    GET /api/photos/<path>/
    Proxies ticket photos through Django so the frontend never calls
    Azure directly. Django generates a fresh signed SAS URL internally,
    fetches the blob, and streams the bytes back to the browser.
    """
    try:
        ticket = MaintenanceTicket.objects.filter(
            Q(photo=path) | Q(photo2=path) | Q(photo3=path) | Q(photo4=path) | Q(photo5=path)
        ).first()
    except Exception:
        ticket = MaintenanceTicket.objects.filter(photo=path).first()

    if not ticket:
        return Response({'detail': 'Not found.'}, status=404)

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


# ── Pagination ──────────────────────────────────────────────────────────────────

class TicketPagination(PageNumberPagination):
    page_size             = 9
    page_size_query_param = 'page_size'
    max_page_size         = 1000


# ── Auth ────────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes   = [RegisterThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_welcome_email(user)
        return Response(UserProfileSerializer(user).data, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ── Superuser: user management ──────────────────────────────────────────────────

class UserListView(generics.ListAPIView):
    serializer_class   = AdminUserSerializer
    permission_classes = [IsSuperuser]

    def get_queryset(self):
        qs     = User.objects.all().order_by('-date_joined')
        role   = self.request.query_params.get('role')
        search = self.request.query_params.get('search')
        if role:
            qs = qs.filter(role=role)
        if search:
            qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search))
        return qs


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


# ── Admin: read-only user list ──────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    queryset           = User.objects.all().order_by('-date_joined')
    serializer_class   = AdminUserSerializer
    permission_classes = [IsCouncilAdmin]


# ── Tickets ─────────────────────────────────────────────────────────────────────

VALID_SORT_FIELDS = {
    'created_at', '-created_at',
    'updated_at', '-updated_at',
    'status', '-status',
    'category', '-category',
}


class TicketListCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    pagination_class   = TicketPagination

    def get_throttles(self):
        if self.request.method == 'POST' and not self.request.user.is_authenticated:
            return [TicketCreateThrottle()]
        return []

    def get_serializer_class(self):
        return TicketDetailSerializer if self.request.method == 'POST' else TicketListSerializer

    def get_queryset(self):
        qs     = MaintenanceTicket.objects.all()
        params = self.request.query_params

        # Status — comma-separated: ?status=pending,in_progress
        if params.get('status'):
            statuses = [s.strip() for s in params['status'].split(',') if s.strip()]
            qs = qs.filter(status__in=statuses)

        # Category — comma-separated: ?category=road,footpath
        if params.get('category'):
            categories = [c.strip() for c in params['category'].split(',') if c.strip()]
            qs = qs.filter(category__in=categories)

        # Search across title, description, and location
        if params.get('search'):
            term = params['search'].strip()
            qs = qs.filter(
                Q(title__icontains=term) |
                Q(description__icontains=term) |
                Q(location_description__icontains=term)
            )

        # Crew filter (admin use)
        if params.get('crew'):
            qs = qs.filter(assigned_crew=params['crew'])

        # Escalated-only filter (admin use)
        if params.get('escalated') == 'true':
            qs = qs.filter(escalated=True)

        # Ordering — whitelisted to prevent arbitrary field exposure
        ordering = params.get('ordering', '-created_at')
        if ordering not in VALID_SORT_FIELDS:
            ordering = '-created_at'
        return qs.order_by(ordering)

    def perform_create(self, serializer):
        """Auto-assign crew from category; link authenticated reporter."""
        category  = self.request.data.get('category', 'other')
        auto_crew = CATEGORY_CREW_MAP.get(category, 'crew-echo')
        ticket    = serializer.save(assigned_crew=auto_crew)
        send_ticket_confirmation(ticket)


class TicketDetailView(generics.RetrieveAPIView):
    queryset           = MaintenanceTicket.objects.all()
    serializer_class   = TicketDetailSerializer
    permission_classes = [AllowAny]


class TicketStatusUpdateView(generics.UpdateAPIView):
    queryset           = MaintenanceTicket.objects.all()
    serializer_class   = TicketStatusSerializer
    permission_classes = [IsCouncilAdmin]
    http_method_names  = ['patch']

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        ticket     = serializer.save()
        if ticket.status != old_status:
            send_ticket_status_update(ticket, old_status=old_status)


class TicketAssignView(generics.UpdateAPIView):
    """
    PATCH /api/requests/<id>/assign/
    Admin can update crew assignment and/or escalate a ticket.
    """
    queryset           = MaintenanceTicket.objects.all()
    serializer_class   = TicketAssignSerializer
    permission_classes = [IsCouncilAdmin]
    http_method_names  = ['patch']

    def perform_update(self, serializer):
        data  = serializer.validated_data
        extra = {}
        if data.get('escalated') and not serializer.instance.escalated:
            extra['escalated_at'] = timezone.now()
            extra['escalated_by'] = self.request.user
        elif not data.get('escalated', True):
            extra['escalated_at']     = None
            extra['escalated_by']     = None
            extra['escalation_level'] = ''
            extra['escalation_note']  = ''
        old_crew = serializer.instance.assigned_crew
        ticket   = serializer.save(**extra)
        if ticket.assigned_crew != old_crew:
            send_ticket_status_update(ticket)


class TicketDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/requests/<id>/delete/
    Hard-delete restricted to superusers only. Regular admins close tickets instead.
    """
    queryset           = MaintenanceTicket.objects.all()
    permission_classes = [IsSuperuser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'detail': 'Ticket deleted.'}, status=status.HTTP_204_NO_CONTENT)


class MyTicketsView(generics.ListAPIView):
    serializer_class   = TicketListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class   = TicketPagination

    def get_queryset(self):
        qs       = MaintenanceTicket.objects.filter(reporter_user=self.request.user)
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering not in VALID_SORT_FIELDS:
            ordering = '-created_at'
        return qs.order_by(ordering)


# ── Map endpoint ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def map_tickets(request):
    """
    GET /api/map/
    Returns all tickets with GPS coordinates in a lightweight format.
    Intentionally omits reporter PII — safe for public consumption.
    Admins get the full serializer (includes reporter + crew info).
    No pagination — the map needs all pins at once.

    Optional filters: ?status=pending,in_progress  ?category=road  ?search=queen+st
    """
    qs = MaintenanceTicket.objects.exclude(lat__isnull=True).exclude(lng__isnull=True)

    params = request.query_params

    if params.get('status'):
        statuses = [s.strip() for s in params['status'].split(',') if s.strip()]
        qs = qs.filter(status__in=statuses)

    if params.get('category'):
        categories = [c.strip() for c in params['category'].split(',') if c.strip()]
        qs = qs.filter(category__in=categories)

    if params.get('search'):
        term = params['search'].strip()
        qs = qs.filter(
            Q(title__icontains=term) |
            Q(location_description__icontains=term)
        )

    qs = qs.order_by('-created_at')

    user = request.user
    if user.is_authenticated and getattr(user, 'is_council_admin', False):
        serializer = TicketDetailSerializer(qs, many=True)
    else:
        serializer = MapTicketSerializer(qs, many=True)

    return Response(serializer.data)


# ── Admin stats breakdown ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsCouncilAdmin])
def admin_stats(request):
    """
    GET /api/admin/stats/
    Detailed breakdown for the admin dashboard — not exposed publicly.
    Returns counts by status, category, and crew plus escalation and GPS coverage.
    """
    all_tickets = MaintenanceTicket.objects.all()

    by_status = dict(
        all_tickets.values('status').annotate(n=Count('id')).values_list('status', 'n')
    )
    by_category = dict(
        all_tickets.values('category').annotate(n=Count('id')).values_list('category', 'n')
    )
    by_crew = dict(
        all_tickets.exclude(assigned_crew='')
        .values('assigned_crew').annotate(n=Count('id'))
        .values_list('assigned_crew', 'n')
    )

    escalated_total = all_tickets.filter(escalated=True).count()
    by_escalation_level = dict(
        all_tickets.filter(escalated=True).exclude(escalation_level='')
        .values('escalation_level').annotate(n=Count('id'))
        .values_list('escalation_level', 'n')
    )

    mapped_count   = all_tickets.exclude(lat__isnull=True).exclude(lng__isnull=True).count()
    unmapped_count = all_tickets.filter(Q(lat__isnull=True) | Q(lng__isnull=True)).count()

    return Response({
        'total':               all_tickets.count(),
        'by_status':           by_status,
        'by_category':         by_category,
        'by_crew':             by_crew,
        'escalated_total':     escalated_total,
        'by_escalation_level': by_escalation_level,
        'mapped_count':        mapped_count,
        'unmapped_count':      unmapped_count,
    })


# ── Public stats ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def public_stats(request):
    """
    GET /api/stats/
    Live aggregated metrics for the public homepage.
    """
    from django.db.models import F, ExpressionWrapper, DurationField
    import statistics

    total_reports  = MaintenanceTicket.objects.count()
    resolved_qs    = MaintenanceTicket.objects.filter(status__in=['resolved', 'closed'])
    resolved_count = resolved_qs.count()

    avg_response_days = None
    if resolved_count > 0:
        durations = resolved_qs.annotate(
            duration=ExpressionWrapper(
                F('updated_at') - F('created_at'),
                output_field=DurationField()
            )
        ).values_list('duration', flat=True)
        days_list = [d.total_seconds() / 86400 for d in durations if d is not None]
        if days_list:
            avg_response_days = round(statistics.median(days_list), 1)

    community_members = User.objects.filter(role='citizen').count()

    return Response({
        'total_reports':     total_reports,
        'resolved_count':    resolved_count,
        'avg_response_days': avg_response_days,
        'community_members': community_members,
    })
