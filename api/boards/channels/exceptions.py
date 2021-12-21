from datetime import datetime
from django.contrib.auth import get_user_model
from rest_framework.exceptions import Throttled

from boards.channels.utils import ChannelCodes
from boards.utils import BoardCommands


class ClientError(Exception):
    def __init__(self, exception=False, **kwargs):
        code = kwargs.get('code', ChannelCodes.ERROR)
        command = kwargs.get('command')
        data = kwargs.get('data')
        detail = kwargs.get('detail')
        message = kwargs.get('message', 'Error')
        user = kwargs.get('user')

        if isinstance(user, get_user_model()):
            user = user.user_slug
        elif not isinstance(user, str):
            user = None

        if isinstance(exception, Exception):
            if hasattr(exception, 'data'):
                data = exception.data
            elif hasattr(exception, 'params'):
                data = exception.params
            if hasattr(exception, 'detail'):
                detail = exception.detail
            elif hasattr(exception, 'message'):
                detail = exception.message
        else:
            exception = False

        self.exception = exception
        self.code = code
        self.command = command
        self.data = data
        self.detail = detail
        self.message = message
        self.created_at = datetime.now().isoformat()
        self.user = user

    def ws_error(self):
        return {
            'code': self.code,
            'error': {
                'command': self.command,
                'data': self.data,
                'detail': self.detail,
                'message': self.message,
                'created_at': self.created_at,
            },
            'user': self.user,
        }


class BoardFailed(ClientError):
    def __init__(self, exception=False, **kwargs):
        kwargs['code'] = kwargs.get('code', ChannelCodes.BOARD_FAILED)
        kwargs['message'] = kwargs.get('message', 'Failed to load board')
        super().__init__(exception, **kwargs)


class ClientThrottled(ClientError):
    def __init__(self, **kwargs):
        # kwargs['code'] = kwargs.get('code', ChannelCodes.THROTTLED)
        kwargs['message'] = kwargs.get('message', 'Too many requests')
        e = Throttled(kwargs.pop('wait', None))
        super().__init__(e, **kwargs)


class InvalidContent(ClientError):
    def __init__(self, exception=False, **kwargs):
        # kwargs['code'] = kwargs.get('code', ChannelCodes.INVALID)
        kwargs['message'] = kwargs.get('message', 'Invalid content')
        super().__init__(exception, **kwargs)


class InviteFailed(ClientError):
    def __init__(self, exception=False, **kwargs):
        kwargs['command'] = kwargs.get('command', BoardCommands.INVITE)
        kwargs['message'] = kwargs.get('message', 'Invitation failed')
        super().__init__(exception, **kwargs)


class InviteNotSent(InviteFailed):
    def __init__(self, exception=False, **kwargs):
        kwargs['message'] = kwargs.get('message', 'Invite not sent')
        super().__init__(exception, **kwargs)


class JoinFailed(ClientError):
    def __init__(self, exception=False, **kwargs):
        kwargs['code'] = kwargs.get('code', ChannelCodes.JOIN_FAILED)
        kwargs['message'] = kwargs.get('message', 'Error joining board')
        super().__init__(exception, **kwargs)


class MissingCommand(ClientError):
    def __init__(self, exception=False, **kwargs):
        # kwargs['code'] = kwargs.get('code', ChannelCodes.MISSING)
        kwargs['command'] = kwargs.get('command', BoardCommands.NO_COMMAND)
        kwargs['message'] = kwargs.get('message', 'Missing command')
        super().__init__(exception, **kwargs)


class NotAllowed(ClientError):
    def __init__(self, exception=False, **kwargs):
        # kwargs['code'] = kwargs.get('code', ChannelCodes.NOT_ALLOWED)
        kwargs['message'] = kwargs.get('message', 'Action not allowed')
        super().__init__(exception, **kwargs)


class UserFailed(ClientError):
    def __init__(self, exception=False, **kwargs):
        kwargs['code'] = kwargs.get('code', ChannelCodes.USER_FAILED)
        kwargs['message'] = kwargs.get('message', 'Failed to load user')
        super().__init__(exception, **kwargs)


class DuplicateDisplayName(ClientError):
    def __init__(self, exception=False, **kwargs):
        kwargs['command'] = kwargs.get('command', BoardCommands.DISPLAY_NAME)
        kwargs['message'] = kwargs.get('message', 'This name is already in use')
        super().__init__(exception, **kwargs)