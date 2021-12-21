from django.urls import include, re_path

from users.api import UserAPI

urlpatterns = [
    re_path(
        r'^users/((?P<user_slug>[\w-]{10})/)?$', UserAPI.as_view(), name='users',
    ),
]
