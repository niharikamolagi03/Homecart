from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, ProfileView,
    UserListView, PendingUsersView, ApproveUserView, RejectUserView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/pending/', PendingUsersView.as_view(), name='pending-users'),
    path('users/<int:user_id>/approve/', ApproveUserView.as_view(), name='approve-user'),
    path('users/<int:user_id>/reject/', RejectUserView.as_view(), name='reject-user'),
]
