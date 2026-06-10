from django.urls import path
from . import views, api_views

app_name = 'users'

urlpatterns = [
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('auth', views.auth_view, name='auth'),
    path('profile/edit/', views.edit_profile_view, name='edit_profile'),
    path('profile/delete/', views.delete_account_view, name='delete_account'),
    path('forgot-password/', views.forgot_password_view, name='forgot_password'),
    path('reset-password/', views.reset_password_view, name='reset_password'),
    path('api/public-key/update/', api_views.update_public_key, name='api-update-public-key'),
    path('api/public-key/<int:user_id>/', api_views.get_public_key, name='api-get-public-key'),
]
