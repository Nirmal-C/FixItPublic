from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView, TokenVerifyView,
)
from .views import (
    hello_world, health_check,
    RegisterView, ProfileView,
    UserListView, UserCreateView, UserDetailView,
    AdminUserListView,
    TicketListCreateView, TicketDetailView,
    TicketStatusUpdateView, MyTicketsView,
)

urlpatterns = [
    path('hello/',  hello_world),
    path('health/', health_check, name='health_check'),

    path('auth/register/',      RegisterView.as_view(),        name='auth-register'),
    path('auth/token/',         TokenObtainPairView.as_view(),  name='token-obtain'),
    path('auth/token/refresh/', TokenRefreshView.as_view(),    name='token-refresh'),
    path('auth/token/verify/',  TokenVerifyView.as_view(),     name='token-verify'),
    path('auth/profile/',       ProfileView.as_view(),         name='auth-profile'),

    path('superuser/users/',          UserListView.as_view(),   name='superuser-user-list'),
    path('superuser/users/create/',   UserCreateView.as_view(), name='superuser-user-create'),
    path('superuser/users/<int:pk>/', UserDetailView.as_view(), name='superuser-user-detail'),

    path('admin/users/',              AdminUserListView.as_view(), name='admin-user-list'),

    path('requests/',                 TicketListCreateView.as_view(),   name='ticket-list-create'),
    path('requests/mine/',            MyTicketsView.as_view(),          name='ticket-mine'),
    path('requests/<int:pk>/',        TicketDetailView.as_view(),       name='ticket-detail'),
    path('requests/<int:pk>/status/', TicketStatusUpdateView.as_view(), name='ticket-status'),
]