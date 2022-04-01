try:
    from hmac import compare_digest
except ImportError:
    def compare_digest(a, b):
        return a == b

import binascii
import re

from channels.db import database_sync_to_async
from django.utils import timezone
from django.utils.functional import LazyObject
from django.utils.translation import gettext_lazy as _
from knox.auth import TokenAuthentication
from knox.crypto import hash_token
from knox.settings import CONSTANTS
from rest_framework.exceptions import AuthenticationFailed

from invitations.models import InviteToken, EmptyToken
from utils import client_ip_url_param_regex


class ClientIPMiddleware:
    """
    Class that adds 'client_ip' from query params to the scope.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        try:
            query_string = scope['query_string'].decode('utf-8')
            pattern = client_ip_url_param_regex()
            client_ip = re.search(pattern, query_string).group(2)
            scope['client_ip'] = client_ip
        except:
            raise
        return await self.inner(scope, receive, send)


class AuthTokenMiddleware:
    """
    Class that adds 'auth_token' from query params to the scope.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        instance = TokenMiddlewareInstance(scope, 'auth_token')
        await instance.resolve_token()
        return await self.inner(instance.scope, receive, send)


class InviteTokenMiddleware:
    """
    Class that adds 'invite_token' from query params to the scope.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        instance = TokenMiddlewareInstance(scope, 'invite_token')
        await instance.resolve_token()
        return await self.inner(instance.scope, receive, send)


class TokenMiddlewareInstance(TokenAuthentication):
    """
    Inner class that is instantiated once per scope.
    """

    def __init__(self, scope, token_name):
        if token_name not in ['auth_token', 'invite_token']:
            raise ValueError('Invalid token_name in TokenMiddlewareInstance')

        self.scope = dict(scope)
        self.token_name = token_name
        self.scope[self.token_name] = LazyObject()

    async def resolve_token(self):
        self.scope[self.token_name]._wrapped = EmptyToken()
        try:
            query_string = self.scope['query_string'].decode('utf-8')
            token_string = re.search(
                r'(^|&)' + re.escape(self.token_name) + r'=([\w-]{64})($|&)',
                query_string,
            ).group(2)

            if self.token_name == 'auth_token':
                token = await self.check_auth_token(token_string)
            elif self.token_name == 'invite_token':
                token = await self.check_invite_token(token_string)

            self.scope[self.token_name]._wrapped = token
        except:
            pass

    @database_sync_to_async
    def check_auth_token(self, token_string):
        return self.authenticate_credentials(token_string.encode('utf-8'))

    @database_sync_to_async
    def check_invite_token(self, token_string):
        for invite_token in InviteToken.objects.filter(
            token_key=token_string[:CONSTANTS.TOKEN_KEY_LENGTH],
        ):
            if self._cleanup_invite_token(invite_token):
                continue
            try:
                digest = hash_token(token_string)
            except (TypeError, binascii.Error):
                continue
            if compare_digest(digest, invite_token.digest):                    
                invitation = invite_token.invitation
                if not invitation or not invitation.board:
                    continue
                return (invitation, invite_token)
        raise AuthenticationFailed(_('Invalid token'))

    def _cleanup_invite_token(self, invite_token):
        for other_token in invite_token.invitation.tokens.all():
            if other_token.digest != invite_token.digest:
                other_token.delete()
        if invite_token.expiry < timezone.now():
            invite_token.delete()
            return True
        return False


def TokenMiddlewareStack(inner):
    return AuthTokenMiddleware(InviteTokenMiddleware(inner))