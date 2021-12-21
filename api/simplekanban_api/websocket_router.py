from channels.routing import ProtocolTypeRouter, URLRouter

from boards.channels.auth import AuthMiddlewareStack
from boards.channels.endpoints import websocket_urlpatterns


application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns),
    ),
})