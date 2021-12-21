from channels.auth import AuthMiddleware, UserLazyObject
from django.contrib.auth.models import AnonymousUser
from django.utils.functional import LazyObject
from django.utils.translation import gettext_lazy as _

from boards.channels.middleware import ClientIPMiddleware, TokenMiddlewareStack
from invitations.models import EmptyInvitation


class CustomAuthMiddleware(AuthMiddleware):
    """
    Middleware which populates scope['user'].
    Needs to be wrapped in AuthTokenMiddleware and ClientIPMiddleware
    (included by default with TokenMiddlewareStack).
    Can populate scope['invitation'] if wrapped in InviteTokenMiddleware
    (also included by default with TokenMiddlewareStack).
    """

    def populate_scope(self, scope):
        if 'auth_token' not in scope:
            msg = 'CustomAuthMiddleware cannot find auth_token in scope.'
            raise ValueError(_(msg))
        if 'client_ip' not in scope:
            msg = 'CustomAuthMiddleware cannot find client_ip in scope.'
            raise ValueError(_(msg))
        if 'user' not in scope:
            scope['user'] = UserLazyObject()
        if 'invitation' not in scope:
            scope['invitation'] = LazyObject()

    async def resolve_scope(self, scope):
        try:
            user = scope['auth_token'][0]
        except:
            user = None
        scope['user']._wrapped = user or AnonymousUser()

        if 'invite_token' in scope:
            try:
                invitation = scope['invite_token'][0]
            except:
                invitation = None
            scope['invitation']._wrapped = invitation or EmptyInvitation()

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        # Scope injection/mutation per this middleware's needs.
        self.populate_scope(scope)
        # Grab the finalized/resolved scope
        await self.resolve_scope(scope)

        return await super().__call__(scope, receive, send)


def AuthMiddlewareStack(inner):
    return ClientIPMiddleware(TokenMiddlewareStack(CustomAuthMiddleware(inner)))