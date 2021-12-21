import json

from itertools import chain

from django.http import HttpRequest
from django.utils.translation import gettext_lazy as _
from rest_framework.request import Request

from authentication.utils import AuthCommands
from boards.utils import BoardCommands
from users.utils import UserCommands


COMMANDS = [
    (command.value, command.label) \
    for command in chain(AuthCommands, BoardCommands, UserCommands)
]
COMMAND_VALUES = [value for value, label in COMMANDS]


def is_jsonable(obj):
    try:
        json.dumps(obj)
        return True
    except (TypeError, OverflowError):
        return False


def parse_request_metadata(request, metadata={}):
    if metadata != {} and isinstance(metadata, dict):
        metadata = {
            key: value for key, value in metadata.items() if is_jsonable(value)
        }
    else:
        metadata = {}

    if isinstance(request, (Request, HttpRequest)):
        if hasattr(request, 'data') and isinstance(request.data, dict):
            metadata['request_data'] = {
                key: value for key, value in request.data.items() \
                if key not in ['password', 'password_2', 'current_password'] \
                and is_jsonable(value)
            }
        if hasattr(request, 'META') and isinstance(request.META, dict):
            for key, value in request.META.items():
                if is_jsonable(value):
                    metadata[key] = value
    elif isinstance(request, dict):
        for key, value in request.items():
            if is_jsonable(value):
                metadata[key] = value
    return metadata


def client_ip_url_param_regex():
    return '(^|&)client_ip=((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))($|&)'

def email_regex():
    return '^[\u00BF-\u1FFF\u2C00-\uD7FF\w\.\+\-]+@[\u00BF-\u1FFF\u2C00-\uD7FF\w\-]+(\.[\u00BF-\u1FFF\u2C00-\uD7FF\w\-]+)+$'

def name_regex():
    return "^[\u00BF-\u1FFF\u2C00-\uD7FF\w\s\-\,\.\']{1,50}$"


error_messages_email = dict(invalid=_('Please enter a valid email address.'))
error_messages_name = dict(invalid=_('Please enter a valid name.'))


__all__ = [
    'COMMANDS', 'COMMAND_VALUES',
    'is_jsonable', 'parse_request_metadata',
    'email_regex', 'name_regex', 'client_ip_url_param_regex',
    'error_messages_email', 'error_messages_name',
]