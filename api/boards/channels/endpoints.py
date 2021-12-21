from django.urls import re_path
from boards.channels.consumers import BoardConsumer

websocket_urlpatterns = [
    re_path(r'wss?/board/(?P<board_slug>[\w-]{10})/$', BoardConsumer.as_asgi()),
]