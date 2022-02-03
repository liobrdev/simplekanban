import logging

from django.contrib.auth import get_user_model, password_validation

from rest_framework.exceptions import ValidationError
from rest_framework.serializers import (
    Serializer, ModelSerializer, CharField, RegexField,)

from users.exceptions import DuplicateEmail
from users.utils import UserCommands
from utils import (
    email_regex, name_regex, parse_request_metadata,
    error_messages_email, error_messages_name,)


logger = logging.getLogger(__name__)

class ReadOnlyUserSerializer(ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['user_slug', 'name', 'email', 'email_is_verified']
        read_only_fields = ['user_slug', 'name', 'email', 'email_is_verified']


class UserSerializer(ModelSerializer):
    user_slug = RegexField(r'^[\w-]{10}$', read_only=True,)
    name = RegexField(
        name_regex(), error_messages=error_messages_name, required=False,)
    email = RegexField(
        email_regex(),
        error_messages=error_messages_email, required=False,)
    password = CharField(
        write_only=True, required=False, allow_blank=True,)
    password_2 = CharField(
        write_only=True, required=False, allow_blank=True,)
    current_password = CharField(write_only=True, required=True,)

    class Meta:
        model = get_user_model()
        fields = (
            'user_slug', 'name', 'email', 'email_is_verified', 'password',
            'password_2', 'current_password',)
        read_only_fields = ('user_slug', 'email_is_verified',)

    def validate_password(self, password): 
        request = self.context['request']
        user = request.user
        if password and not password_validation.validate_password(
            password, user,
        ):
            if password == user.user_slug:
                raise ValidationError('Password cannot be your user ID.')
            return password
        elif not password:
            return None

    def validate_password_2(self, password_2):
        return self.validate_password(password_2)

    def validate_current_password(self, current_password):
        request = self.context['request']
        user = request.user
        if user.check_password(current_password):
            return True
        raise ValidationError('Invalid password.')

    def save(self):
        current_password = self.validated_data.pop('current_password')

        request = self.context['request']
        user = request.user
        user.name = self.validated_data.get('name', user.name)

        email = self.validated_data.get('email', None)
        password = self.validated_data.get('password', None)
        password_2 = self.validated_data.get('password_2', None)

        if email is not None and email != user.email:
            user.email = email
            user.email_is_verified = False

        if password:
            if not password_2 or password_2 != password:
                e = ValidationError({
                    'password_2': ['Passwords do not match.'],
                })
                logger.exception('Error changing user password.', exc_info=e, extra={
                    'user': user.user_slug,
                    'command': UserCommands.UPDATE,
                    'client_ip': request.META['CLIENT_IP'],
                    'metadata': parse_request_metadata(request),
                })
                raise e
            user.set_password(password)
        elif password_2:
            e = ValidationError({
                'password': ['Invalid password change.'],
            })
            logger.exception('Error changing user password.', exc_info=e, extra={
                'user': user.user_slug,
                'command': UserCommands.UPDATE,
                'client_ip': request.META['CLIENT_IP'],
                'metadata': parse_request_metadata(request),
            })
            raise e

        try:
            user.save()
        except DuplicateEmail:
            raise ValidationError({
                'email': [
                    'Email address unavailable - please choose a different one.',
                ],
            })
        return user


class UserDeactivateSerializer(Serializer):
    email = RegexField(
        email_regex(), error_messages=error_messages_email, write_only=True,)
    current_password = CharField(trim_whitespace=False, write_only=True)

    def validate_email(self, value):
        email = value.lower()
        request = self.context['request']
        user = request.user
        if email == user.email:
            return email
        raise ValidationError('Invalid email.')

    def validate_current_password(self, current_password):
        request = self.context['request']
        user = request.user
        if user.check_password(current_password):
            return True
        raise ValidationError('Invalid password.')