import logging

from django.core.cache import cache


logger = logging.getLogger(__name__)

class InvalidLoginCache(object):
    @staticmethod
    def _key(email):
        return f'invalid_login_{email}'

    @staticmethod
    def _value(lockout_timestamp, attempt_timestamps):
        return dict(
            lockout_start=lockout_timestamp,
            invalid_attempts=attempt_timestamps,)

    @staticmethod
    def set(email, attempt_timestamps, lockout_timestamp=None):
        try:
            cache.set(
                InvalidLoginCache._key(email),
                InvalidLoginCache._value(lockout_timestamp, attempt_timestamps),)
        except Exception as e:
            logger.exception('Error setting invalid login cache', exc_info=e)

    @staticmethod
    def get(email):
        try:
            return cache.get(InvalidLoginCache._key(email))
        except Exception as e:
            logger.exception('Error getting invalid login cache', exc_info=e)

    @staticmethod
    def delete(email):
        try:
            cache.delete(InvalidLoginCache._key(email))
        except Exception as e:
            logger.exception('Error deleting invalid login cache', exc_info=e)