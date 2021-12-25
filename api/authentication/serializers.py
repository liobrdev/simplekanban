from datetime import datetime

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework.exceptions import (
    AuthenticationFailed, PermissionDenied, ValidationError,)
from rest_framework.serializers import (
    Serializer, CharField, RegexField, SlugField,)

from authentication.invalid_login import InvalidLoginCache
from utils import (
    email_regex, name_regex, error_messages_email, error_messages_name,)


User = get_user_model()

class LoginSerializer(Serializer):
    email = RegexField(
        email_regex(), error_messages=error_messages_email, write_only=True,)
    password = CharField(trim_whitespace=False, write_only=True)

    def validate(self, data):
        email = data.get('email').lower()
        password = data.get('password')

        cache_entry = InvalidLoginCache.get(email)
        now = datetime.now().timestamp()

        if cache_entry and cache_entry.get('lockout_start'):
            lockout_start = cache_entry.get('lockout_start')
            locked_out = now < lockout_start + 300

            if locked_out:
                msg = 'You have been temporarily locked out of this account.'
                raise PermissionDenied(msg)
            else:
                InvalidLoginCache.delete(email)

        user = authenticate(
            self.context.get('request'), email=email, password=password,)

        if not user or not user.is_active:
            lockout_timestamp = None
            e = AuthenticationFailed
            msg = 'Failed to log in with the info provided.'

            attempt_timestamps = []
            if cache_entry and cache_entry.get('invalid_attempts'):
                attempt_timestamps = [
                    time for time in cache_entry.get('invalid_attempts') \
                    if time > now - 300
                ]

            attempt_timestamps.append(now)

            if len(attempt_timestamps) >= 5 and len(attempt_timestamps) < 9:
                msg += (
                    ' For security purposes, this account will be temporarily '
                    f'locked after {10 - len(attempt_timestamps)} more '
                    'unsuccessful login attempts.')
            if len(attempt_timestamps) == 9:
                msg += (
                    ' For security purposes, this account will be temporarily '
                    f'locked after 1 more unsuccessful login attempt.')
            elif len(attempt_timestamps) >= 10:
                lockout_timestamp = now
                msg += ' You have been temporarily locked out of this account.'
                e = PermissionDenied

            InvalidLoginCache.set(email, attempt_timestamps, lockout_timestamp)
            raise e(msg)
        return user


class RegistrationSerializer(Serializer):
    name = RegexField(
        name_regex(), error_messages=error_messages_name, write_only=True,)
    email = RegexField(
        email_regex(), error_messages=error_messages_email, write_only=True,)
    password = CharField(trim_whitespace=False, write_only=True)
    password_2 = CharField(trim_whitespace=False, write_only=True)

    def validate(self, data):
        name        = data.get('name').strip()
        email       = data.get('email').lower().strip()
        password    = data.get('password')
        password_2  = data.get('password_2')

        if password != password_2:
            raise ValidationError('Passwords do not match.')

        if not validate_password(password, User(email=email, name=name)):
            return dict(
                name=name,
                email=email,
                password=password,
                has_beta_account=True,)


class ResetPasswordRequestSerializer(Serializer):
    email = RegexField(
        email_regex(), error_messages=error_messages_email, write_only=True,)

    def validate_email(self, email):
        return email.lower().strip()


class ResetPasswordProceedSerializer(Serializer):
    email = RegexField(
        email_regex(), error_messages=error_messages_email, write_only=True,)
    password = CharField(trim_whitespace=False, write_only=True)
    password_2 = CharField(trim_whitespace=False, write_only=True)
    token = SlugField(max_length=64, min_length=64, write_only=True)

    def validate(self, data):
        email       = data.get('email').lower().strip()
        password    = data.get('password')
        password_2  = data.get('password_2')
        token       = data.get('token')

        if password != password_2:
            raise ValidationError('Passwords do not match.')
        return dict(email=email, password=password, token=token)