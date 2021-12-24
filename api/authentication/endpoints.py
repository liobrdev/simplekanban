from django.urls import re_path

from authentication.api import (
    LoginAPI, LogoutAPI, RegistrationAPI,
    ResetPasswordRequestAPI, ResetPasswordProceedAPI,)


urlpatterns = [
    re_path(r'^auth/login/$', LoginAPI.as_view(), name='login'),
    re_path(r'^auth/logout/$', LogoutAPI.as_view(), name='logout'),
    re_path(r'^auth/register/$', RegistrationAPI.as_view(), name='register'),
    re_path(
        r'^auth/reset_password/request/$',
        ResetPasswordRequestAPI.as_view(),
        name='reset_password_request',
    ),
    re_path(
        r'^auth/reset_password/proceed/$',
        ResetPasswordProceedAPI.as_view(),
        name='reset_password_proceed',
    ),
]
