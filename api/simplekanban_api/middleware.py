from django.utils.deprecation import MiddlewareMixin
from ipware import get_client_ip


class ClientIPMiddleware(MiddlewareMixin):
    def process_request(self, request):
        client_ip, is_routable = get_client_ip(request)
        request.META['CLIENT_IP'] = client_ip
        request.META['CLIENT_IP_IS_ROUTABLE'] = is_routable