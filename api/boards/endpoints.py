from django.urls import re_path

from boards.api import BoardAPI, RetrieveBoardView

urlpatterns = [
    re_path(r'^boards/$', BoardAPI.as_view(), name='boards'),
    re_path(
        r'^boards/(?P<board_slug>[\w-]{10})/$',
        RetrieveBoardView.as_view(),
        name='board',
    ),
]