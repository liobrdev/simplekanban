from django.urls import re_path

from authentication.api import (
    LoginAPI, LogoutAPI, RegistrationAPI,
    ForgotPasswordAPI, ResetPasswordAPI,)


urlpatterns = [
    re_path(r'^auth/login/$', LoginAPI.as_view(), name='login'),
    re_path(r'^auth/logout/$', LogoutAPI.as_view(), name='logout'),
    re_path(r'^auth/register/$', RegistrationAPI.as_view(), name='register'),
    re_path(
        r'^auth/forgot_password/$',
        ForgotPasswordAPI.as_view(),
        name='forgot_password',
    ),
    re_path(
        r'^auth/reset_password/$',
        ResetPasswordAPI.as_view(),
        name='reset_password',
    ),
]
