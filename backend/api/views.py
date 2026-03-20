import requests as http_requests
from django.http import JsonResponse, HttpResponse
from django.db import connection
from django.db.models import Q, Count
from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import AnonRateThrottle

from .models import MaintenanceTicket, CATEGORY_CREW_MAP
from .utils import extract_gps_exif
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
        """Auto-assign crew from category; check spatial dupe; extract EXIF GPS if not supplied."""
        from rest_framework.exceptions import ValidationError as DRFValidationError

        category = self.request.data.get('category', 'other')
        auto_crew = CATEGORY_CREW_MAP.get(category, 'crew-echo')

        ticket = serializer.save(assigned_crew=auto_crew)

        # If the citizen didn't provide GPS coordinates, try to read them from
        # EXIF metadata embedded in the uploaded photos.
        if ticket.lat is None or ticket.lng is None:
            for field_name in ('photo', 'photo2', 'photo3', 'photo4', 'photo5'):
                photo_field = getattr(ticket, field_name)
                if photo_field:
                    coords = extract_gps_exif(photo_field)
                    if coords:
                        ticket.lat, ticket.lng = coords
                        ticket.save(update_fields=['lat', 'lng'])
                        break

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
    Returns counts by status, category, and crew plus escalation, GPS coverage,
    crew performance, SLA stats, and 30-day daily trend.
    """
    from django.db.models import Avg, F, ExpressionWrapper, DurationField, Case, When, IntegerField
    from django.utils import timezone as tz
    import datetime

    all_tickets = MaintenanceTicket.objects.all()
    now = tz.now()

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

    # ── Crew performance ──────────────────────────────────────────────────────
    crew_stats = []
    for crew_id in ['crew-alpha', 'crew-bravo', 'crew-charlie', 'crew-delta', 'crew-echo']:
        crew_qs = all_tickets.filter(assigned_crew=crew_id)
        total_c = crew_qs.count()
        resolved_c = crew_qs.filter(status__in=['resolved', 'closed']).count()
        avg_hours = None
        resolved_with_times = crew_qs.filter(
            status__in=['resolved', 'closed']
        ).annotate(
            duration=ExpressionWrapper(
                F('updated_at') - F('created_at'),
                output_field=DurationField()
            )
        ).values_list('duration', flat=True)
        durations = [d.total_seconds() / 3600 for d in resolved_with_times if d]
        if durations:
            avg_hours = round(sum(durations) / len(durations), 1)
        crew_stats.append({
            'crew':          crew_id,
            'ticket_count':  total_c,
            'resolved_count': resolved_c,
            'avg_resolution_hours': avg_hours,
        })

    # ── SLA stats — pending >48 h, in_progress >72 h are overdue ─────────────
    pending_sla_cutoff     = now - datetime.timedelta(hours=48)
    in_progress_sla_cutoff = now - datetime.timedelta(hours=72)

    on_time = all_tickets.filter(
        Q(status='pending',     created_at__gte=pending_sla_cutoff) |
        Q(status='in_progress', created_at__gte=in_progress_sla_cutoff) |
        Q(status__in=['resolved', 'closed'])
    ).count()

    overdue = all_tickets.filter(
        Q(status='pending',     created_at__lt=pending_sla_cutoff) |
        Q(status='in_progress', created_at__lt=in_progress_sla_cutoff)
    ).count()

    # Resolution within 72 h
    resolved_qs = all_tickets.filter(status__in=['resolved', 'closed'])
    resolved_total = resolved_qs.count()
    resolved_fast = 0
    if resolved_total:
        sla_72h = datetime.timedelta(hours=72)
        for t in resolved_qs.annotate(
            duration=ExpressionWrapper(F('updated_at') - F('created_at'), output_field=DurationField())
        ):
            if t.duration and t.duration <= sla_72h:
                resolved_fast += 1
    resolution_rate_pct = round(resolved_fast / resolved_total * 100, 1) if resolved_total else 0

    # ── 30-day daily trend ────────────────────────────────────────────────────
    thirty_days_ago = now - datetime.timedelta(days=30)
    daily_qs = (
        all_tickets
        .filter(created_at__gte=thirty_days_ago)
        .extra(select={'day': "DATE(created_at)"})
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )
    daily_trend = [{'date': str(row['day']), 'count': row['count']} for row in daily_qs]

    return Response({
        'total':               all_tickets.count(),
        'by_status':           by_status,
        'by_category':         by_category,
        'by_crew':             by_crew,
        'escalated_total':     escalated_total,
        'by_escalation_level': by_escalation_level,
        'mapped_count':        mapped_count,
        'unmapped_count':      unmapped_count,
        'crew_stats':          crew_stats,
        'sla_stats': {
            'on_time':  on_time,
            'overdue':  overdue,
        },
        'resolution_rate_pct': resolution_rate_pct,
        'daily_trend':         daily_trend,
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


# ── AI Log ──────────────────────────────────────────────────────────────────────

class AILogListView(generics.ListAPIView):
    """
    GET /api/ai-log/
    Returns all real GPT-4o decisions for the admin AI Log page.
    Restricted to council admins and above.
    """
    permission_classes = [IsCouncilAdmin]

    def get_serializer_class(self):
        from .serializers import AILogSerializer
        return AILogSerializer

    def get_queryset(self):
        from .models import AILog
        return AILog.objects.select_related('ticket').all()


class AILogBackfillView(generics.GenericAPIView):
    """
    POST /api/ai-log/backfill/
    Queues GPT-4o analysis for every ticket that does not yet have an AILog entry.
    Spawns a background thread per ticket so the response returns immediately.
    Restricted to council admins and above.
    """
    permission_classes = [IsCouncilAdmin]

    def post(self, request, *args, **kwargs):
        from .models import AILog, MaintenanceTicket
        from .signals import _analyse_and_save
        import threading

        # Find all tickets that have no AILog entry yet
        analysed_ids = AILog.objects.values_list('ticket_id', flat=True)
        pending = MaintenanceTicket.objects.exclude(pk__in=analysed_ids)
        count   = pending.count()

        if count == 0:
            return Response({'detail': 'All tickets already analysed.', 'queued': 0})

        # Spawn a daemon thread per ticket — identical to the post_save signal path
        for ticket in pending:
            thread = threading.Thread(
                target=_analyse_and_save,
                args=(ticket.pk,),
                daemon=True,
            )
            thread.start()

        return Response({
            'detail': f'Queued GPT-4o analysis for {count} ticket(s). Results will appear shortly.',
            'queued': count,
        })


class AILogRegenerateView(generics.GenericAPIView):
    """
    POST /api/ai-log/regenerate/
    Re-runs GPT-4o analysis on ALL tickets, overwriting any existing AILog entries.
    Use this to refresh decisions after changing the system prompt or model.
    Restricted to council admins and above.
    """
    permission_classes = [IsCouncilAdmin]

    def post(self, request, *args, **kwargs):
        from .models import MaintenanceTicket
        from .signals import _analyse_and_save
        import threading

        tickets = MaintenanceTicket.objects.all()
        count   = tickets.count()

        if count == 0:
            return Response({'detail': 'No tickets to analyse.', 'queued': 0})

        for ticket in tickets:
            thread = threading.Thread(
                target=_analyse_and_save,
                args=(ticket.pk,),
                daemon=True,
            )
            thread.start()

        return Response({
            'detail': f'Queued GPT-4o re-analysis for all {count} ticket(s). Results will appear shortly.',
            'queued': count,
        })


class AILogClearView(generics.GenericAPIView):
    """
    DELETE /api/ai-log/clear/
    Deletes all AILog entries from the database.
    Tickets are not affected — only the AI decision records are removed.
    Restricted to superusers only given the destructive nature of the action.
    """
    permission_classes = [IsSuperuser]

    def delete(self, request, *args, **kwargs):
        from .models import AILog
        count, _ = AILog.objects.all().delete()
        return Response({
            'detail': f'Cleared {count} AI log entry(s). Tickets are untouched.',
            'deleted': count,
        })


# ── Profile: avatar upload ────────────────────────────────────────────────────

class AvatarUploadView(generics.GenericAPIView):
    """
    GET  /api/auth/avatar/ — proxy-stream the current user's avatar image.
    POST /api/auth/avatar/ — upload a new avatar (multipart/form-data, field 'avatar').

    The GET method fetches the image from Azure on the server side and streams it
    back so the browser never needs a SAS URL directly. This avoids expiry,
    CORS, and credential issues entirely.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        if not user.avatar:
            return Response({'detail': 'No avatar.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            sas_url = user.avatar.url  # fresh SAS URL, generated server-side
        except Exception:
            return Response({'detail': 'Avatar unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            r = http_requests.get(sas_url, timeout=10, stream=True)
            if not r.ok:
                return Response({'detail': 'Avatar unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            content_type = r.headers.get('Content-Type', 'image/jpeg')
            response = HttpResponse(r.content, content_type=content_type)
            response['Cache-Control'] = 'private, max-age=86400'
            return response
        except Exception:
            return Response({'detail': 'Avatar unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    def post(self, request, *args, **kwargs):
        user = request.user
        avatar = request.FILES.get('avatar')
        if not avatar:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        allowed = ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
        if avatar.content_type not in allowed:
            return Response({'detail': 'Please upload a JPG, PNG, WebP, or GIF image.'}, status=status.HTTP_400_BAD_REQUEST)

        if avatar.size > 5 * 1024 * 1024:
            return Response({'detail': 'Avatar must be smaller than 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.avatar:
            try:
                user.avatar.delete(save=False)
            except Exception:
                pass

        user.avatar = avatar
        user.save(update_fields=['avatar'])

        url = request.build_absolute_uri(user.avatar.url) if user.avatar else None
        return Response({'avatar_url': url})


# ── Profile: change password ──────────────────────────────────────────────────

class ChangePasswordView(generics.GenericAPIView):
    """
    POST /api/auth/change-password/
    Body: { current_password, new_password, confirm_password }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        current  = request.data.get('current_password', '')
        new_pw   = request.data.get('new_password', '')
        confirm  = request.data.get('confirm_password', '')

        if not user.check_password(current):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_pw) < 8:
            return Response({'detail': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_pw != confirm:
            return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_pw == current:
            return Response({'detail': 'New password must be different from your current password.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_pw)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})


# ── Forgot password: send reset link ─────────────────────────────────────────

class ForgotPasswordView(generics.GenericAPIView):
    """
    POST /api/auth/forgot-password/
    Body: { email }
    Always returns 200 to prevent email enumeration.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        from .emails import send_password_reset_email
        email = request.data.get('email', '').strip().lower()
        User = get_user_model()

        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
            uid   = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            site_url = getattr(__import__('django.conf', fromlist=['settings']).settings, 'SITE_URL', 'http://localhost:5173')
            reset_link = f'{site_url}/reset-password?uid={uid}&token={token}'
            send_password_reset_email(user, reset_link)
        except User.DoesNotExist:
            pass

        return Response({'detail': 'If an account with that email exists, a reset link has been sent.'})


# ── Reset password: validate token + set new password ────────────────────────

class ResetPasswordView(generics.GenericAPIView):
    """
    POST /api/auth/reset-password/
    Body: { uid, token, new_password, confirm_password }
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        User  = get_user_model()
        uid   = request.data.get('uid', '')
        token = request.data.get('token', '')
        new_pw  = request.data.get('new_password', '')
        confirm = request.data.get('confirm_password', '')

        if not uid or not token:
            return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pk   = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'This reset link has expired or already been used.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_pw) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_pw != confirm:
            return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_pw)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password reset successfully. You can now sign in.'})

