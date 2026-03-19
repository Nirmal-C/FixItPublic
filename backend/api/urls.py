from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView, TokenObtainPairView

from .token_serializer import CustomTokenObtainPairSerializer
from .views import (
    hello_world, health_check,
    serve_photo,
    public_stats,
    admin_stats,
    map_tickets,
    RegisterView, ProfileView,
    UserListView, UserCreateView, UserDetailView,
    AdminUserListView,
    TicketListCreateView, TicketDetailView,
    TicketStatusUpdateView, TicketAssignView, TicketDeleteView, MyTicketsView,
)
from .emails import send_signin_notification


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code < 300:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            username = request.data.get('username', '')
            try:
                user = User.objects.get(username=username)
                send_signin_notification(user)
            except User.DoesNotExist:
                pass
        return response


urlpatterns = [
    path('hello/',  hello_world),
    path('health/', health_check, name='health_check'),

    # ── Public stats ──────────────────────────────────────────────────────────
    path('stats/',       public_stats, name='public-stats'),

    # ── Admin stats breakdown (council admin+) ─────────────────────────────
    path('admin/stats/', admin_stats, name='admin-stats'),

    # ── Map endpoint (public — PII-safe; admins get full detail) ──────────
    path('map/', map_tickets, name='map-tickets'),

    # ── Auth ─────────────────────────────────────────────────────────────────
    path('auth/register/',      RegisterView.as_view(),              name='auth-register'),
    path('auth/token/',         CustomTokenObtainPairView.as_view(), name='token-obtain'),
    path('auth/token/refresh/', TokenRefreshView.as_view(),          name='token-refresh'),
    path('auth/token/verify/',  TokenVerifyView.as_view(),           name='token-verify'),
    path('auth/profile/',       ProfileView.as_view(),               name='auth-profile'),

    # ── Photos ───────────────────────────────────────────────────────────────
    path('photos/<path:path>/', serve_photo, name='serve-photo'),

    # ── Superuser: full user CRUD ─────────────────────────────────────────
    path('superuser/users/',          UserListView.as_view(),   name='superuser-user-list'),
    path('superuser/users/create/',   UserCreateView.as_view(), name='superuser-user-create'),
    path('superuser/users/<int:pk>/', UserDetailView.as_view(), name='superuser-user-detail'),

    # ── Admin: read-only user list ────────────────────────────────────────
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),

    # ── Tickets ───────────────────────────────────────────────────────────
    path('requests/',                        TicketListCreateView.as_view(),   name='ticket-list-create'),
    path('requests/mine/',                   MyTicketsView.as_view(),          name='ticket-mine'),
    path('requests/<int:pk>/',               TicketDetailView.as_view(),       name='ticket-detail'),
    path('requests/<int:pk>/status/',        TicketStatusUpdateView.as_view(), name='ticket-status'),
    path('requests/<int:pk>/assign/',        TicketAssignView.as_view(),       name='ticket-assign'),
    path('requests/<int:pk>/delete/',        TicketDeleteView.as_view(),       name='ticket-delete'),
]
