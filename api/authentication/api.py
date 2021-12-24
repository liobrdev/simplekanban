import logging

from datetime import timedelta
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.signals import user_logged_out
from django.utils import timezone

from knox.settings import CONSTANTS, knox_settings
from knox.views import LoginView, LogoutView

from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed, PermissionDenied, Throttled, ValidationError,)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import ResetPasswordToken
from authentication.reset_password import send_reset_password_email
from authentication.serializers import (
    LoginSerializer,
    RegistrationSerializer,
    ResetPasswordRequestSerializer,
    ResetPasswordProceedSerializer,)
from authentication.utils import AuthCommands
from users.exceptions import DuplicateEmail, DuplicateSuperUser
from utils import parse_request_metadata
from utils.exceptions import RequestError
from utils.throttling import throttle_command

logger = logging.getLogger(__name__)


class LoginAPI(LoginView):
    permission_classes = (AllowAny,)

    def get_token_ttl(self):
        if self.request.user_agent.is_mobile:
            return None
        return knox_settings.TOKEN_TTL

    def post(self, request, format=None):
        try:
            if throttle_command(
                AuthCommands.LOGIN, request.META['CLIENT_IP'], request,
            ):
                raise Throttled()
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data
            login(request, user)
            return super().post(request, format=None)
        except (AuthenticationFailed, PermissionDenied, Throttled) as e:
            raise e
        except ValidationError as e:
            if hasattr(e, 'detail') and isinstance(e.detail, dict):
                for value in e.detail.values():
                    if value in [
                        ['This field is required.'],
                        ['This field may not be blank.'],
                    ]:
                        logger.exception('Missing login data.', exc_info=e, extra={
                            'client_ip': request.META['CLIENT_IP'],
                            'command': AuthCommands.LOGIN,
                            'metadata': parse_request_metadata(request),
                        })
                        break
            raise e
        except Exception as e:
            logger.exception('User login error.', exc_info=e, extra={
                'client_ip': request.META['CLIENT_IP'],
                'command': AuthCommands.LOGIN,
                'metadata': parse_request_metadata(request),
            })
            raise RequestError('User login error.')


class RegistrationAPI(LoginAPI):
    def post(self, request, format=None):
        try:
            if throttle_command(
                AuthCommands.REGISTER, request.META['CLIENT_IP'], request,
            ):
                raise Throttled()
            registration = RegistrationSerializer(data=request.data)
            registration.is_valid(raise_exception=True)
            data = registration.validated_data
            user = get_user_model().objects.create_user(**data)
            return super().post(request, format=None)
        except Throttled as e:
            raise e
        except ValidationError as e:
            if hasattr(e, 'detail') and isinstance(e.detail, dict):
                for value in e.detail.values():
                    if value in [
                        ['This field is required.'],
                        ['This field may not be blank.'],
                    ]:
                        logger.exception('Missing register data.', exc_info=e, extra={
                            'client_ip': request.META['CLIENT_IP'],
                            'command': AuthCommands.REGISTER,
                            'metadata': parse_request_metadata(request),
                        })
                        break
            raise e
        except PermissionDenied as e:
            if (
                hasattr(e, 'detail') and
                'You have been temporarily locked out of this account' \
                in e.detail
            ):
                try:
                    user = get_user_model().objects.get(email=request.data['email'])
                    user.is_active = False
                    user.save(update_fields=['is_active', 'updated_at'])
                except Exception as err:
                    logger.exception(
                        'Attempted register with locked email. Error deactivating.',
                        exc_info=err,
                        extra={
                            'client_ip': request.META['CLIENT_IP'],
                            'command': AuthCommands.REGISTER,
                            'metadata': parse_request_metadata(request),
                        },
                    )
            raise e
        except (DuplicateEmail, DuplicateSuperUser):
            raise PermissionDenied('Cannot create account with this email.')
        except Exception as e:
            logger.exception('User registration error.', exc_info=e, extra={
                'client_ip': request.META['CLIENT_IP'],
                'command': AuthCommands.REGISTER,
                'metadata': parse_request_metadata(request),
            })
            raise RequestError('User registration error.')


class LogoutAPI(LogoutView):
    def post(self, request, format=None):
        try:
            auth_header = request.headers.get('Authorization')
            token_key = auth_header.split()[1][:CONSTANTS.TOKEN_KEY_LENGTH]
            token = request.user.auth_token_set.get(token_key=token_key)
            deleted = token.delete()
            if deleted != (1, { 'knox.AuthToken': 1 }):
                raise RuntimeError('Token was not deleted properly')
            request._auth.delete()
            user_logged_out.send(sender=request.user.__class__,
                                 request=request, user=request.user)
            logout(request)
        except Exception as e:
            logger.exception('User logout error.', exc_info=e, extra={
                'user': request.user.user_slug,
                'client_ip': request.META['CLIENT_IP'],
                'command': AuthCommands.LOGOUT,
                'metadata': parse_request_metadata(request),
            })
        finally:
            return Response(None, status=status.HTTP_204_NO_CONTENT)


class ResetPasswordRequestAPI(APIView):
    def post(self, request, format=None):
        serializer = ResetPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data

        if not email:
            return Response(None, status=status.HTTP_204_NO_CONTENT)

        try:
            token = ResetPasswordToken.objects.get(
                email=email,
                expiry__gt=timezone.now(),
            )
        except ResetPasswordToken.DoesNotExist:
            try:
                token = ResetPasswordToken.objects.create(
                    email=email,
                    expiry=timedelta(hours=1),
                )
            except Exception as e:
                logger.exception('Create reset token failed.', exc_info=e, extra={
                    'client_ip': request.META['CLIENT_IP'],
                    'command': AuthCommands.RESET_PW_REQUEST,
                    'metadata': parse_request_metadata(request),
                })
                raise RequestError()

            user_agent = request.user_agent
            device_name = user_agent.device.family
            browser_name = (
                f'{user_agent.browser.family} '
                f'{user_agent.browser.version_string}'
            )

            send_reset_password_email(email, token[1], device_name, browser_name)

        return Response(None, status=status.HTTP_204_NO_CONTENT)


class ResetPasswordProceedAPI(APIView):
    def post(self, request, format=None):
        # TO DO
        return Response(None, status=status.HTTP_204_NO_CONTENT)