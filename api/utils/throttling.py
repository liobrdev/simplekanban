import logging

from datetime import datetime
from re import search

from django.core.exceptions import ImproperlyConfigured
from rest_framework.exceptions import Throttled
from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle

from authentication.utils import AuthCommands
from boards.utils import BoardCommands
from users.utils import UserCommands
from utils import COMMAND_VALUES, parse_request_metadata


logger = logging.getLogger('throttling')

THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES

class CustomRateThrottle(SimpleRateThrottle):
    cache_format = 'throttle_%(scope)s_%(ident)s_%(rate)s'

    def __init__(self, command, rate, client_ip, context=None, **kwargs):
        if not isinstance(command, str):
            raise ImproperlyConfigured(f"Invalid throttle command '{command}'")
        if not client_ip or not isinstance(client_ip, str):
            raise ImproperlyConfigured(f"Invalid throttle IP '{client_ip}'")

        self.board = None
        self.user = None
        self.command = command
        self.invalid_command = kwargs.get('invalid_command')
        self.rate = rate
        self.client_ip = client_ip
        self.context = context

        board = kwargs.get('board')
        if isinstance(board, str):
            self.board = board

        user = kwargs.get('user')
        if isinstance(user, str):
            self.user = user

    def allow_request(self):
        '''
        Implement the check to see if the request should be throttled.
        On success calls `throttle_success`.
        On failure calls `throttle_failure`.
        '''
        self.num_requests, self.duration = self.parse_rate(self.rate)
        self.key = self.get_cache_key()
        self.history = self.cache.get(self.key, [])
        self.now = datetime.now().timestamp()

        # print('self.rate:', self.rate)
        # print('self.num_requests:', self.num_requests)
        # print('self.duration:', self.duration)
        # print('self.key:', self.key)
        # print('self.history:', self.history)
        # print('self.now:', self.now)

        # Drop any requests from the history which have now passed the
        # throttle duration
        while (
            self.history and
            self.history[-1]['timestamp'] <= self.now - self.duration
        ):
            self.history.pop()

        # Log the first throttled request
        if len(self.history) >= self.num_requests:
            # print('THROTTLING!')
            if not self.history[0].get('was_logged'):
                logger.error('Client was throttled.', extra={
                    'board': self.board,
                    'user': self.user,
                    'client_ip': self.client_ip,
                    'command': self.command,
                    'metadata': parse_request_metadata(self.context, {
                        'invalid_command': self.invalid_command,
                    }),
                })
                self.history[0]['was_logged'] = True
                self.cache.set(self.key, self.history)
                # print('THROTTLE LOGGED')
            return self.throttle_failure()
        return self.throttle_success()

    def throttle_success(self):
        """
        Inserts the current request's timestamp along with the key
        into the cache.
        """
        # print('NOT THROTTLED')
        self.history.insert(0, { 'timestamp': self.now })
        self.cache.set(self.key, self.history)
        return True

    def wait(self):
        """
        Returns the recommended next request time in seconds.
        """
        if self.history:
            timestamp = self.history[-1]['timestamp']
            remaining_duration = self.duration - (self.now - timestamp)
        else:
            remaining_duration = self.duration

        available_requests = self.num_requests - len(self.history) + 1
        if available_requests <= 0:
            return None

        return remaining_duration / float(available_requests)

    def get_cache_key(self):
        return self.cache_format % {
            'scope': self.command,
            'ident': self.client_ip,
            'rate': self.rate.replace('/', '_'),
        }


def throttle_command(command, client_ip, context=None, **kwargs):
    if command not in COMMAND_VALUES:
        kwargs['invalid_command'] = command
        command = 'invalid_command'

    try:
        throttle_rates = THROTTLE_RATES[command]
    except KeyError:
        try:
            throttle_rates = THROTTLE_RATES['default']
        except KeyError:
            throttle_rates = ['120/m']

    throttled = False
    for rate in throttle_rates:
        throttle = CustomRateThrottle(
            command, rate, client_ip, context, **kwargs,)
        if not throttle.allow_request():
            throttled = True
    return throttled