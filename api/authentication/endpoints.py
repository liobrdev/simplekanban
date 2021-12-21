from django.urls import re_path

from authentication.api import LoginAPI, LogoutAPI, RegistrationAPI

urlpatterns = [
    re_path(r'^auth/login/$', LoginAPI.as_view(), name='login'),
    re_path(r'^auth/logout/$', LogoutAPI.as_view(), name='logout'),
    re_path(r'^auth/register/$', RegistrationAPI.as_view(), name='register'),
]
