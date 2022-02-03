import logging
import random
import time

from datetime import timedelta
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.signals import user_logged_out
from django.utils import timezone

from knox.settings import CONSTANTS
from knox.views import LoginView, LogoutView

from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed, PermissionDenied, Throttled, ValidationError,)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.invalid_login import InvalidLoginCache
from authentication.models import EmailVerificationToken, PasswordRecoveryToken
from authentication.reset_password import (
    send_reset_password_email, check_reset_token,)
from authentication.serializers import (
    LoginSerializer, RegistrationSerializer, ForgotPasswordSerializer,
    ResetPasswordSerializer, VerificationSerializer,)
from authentication.utils import AuthCommands
from authentication.verification import (
    send_verification_email, check_verification_token,)
from users.exceptions import DuplicateEmail, DuplicateSuperUser
from utils import parse_request_metadata
from utils.exceptions import RequestError
from utils.throttling import throttle_command


logger = logging.getLogger(__name__)

User = get_user_model()

class LoginAPI(LoginView):
    permission_classes = (AllowAny,)

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
            user = User.objects.create_user(**data)
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
                    user = User.objects.get(email=request.data['email'])
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


class ForgotPasswordAPI(APIView):
    def post(self, request, format=None):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = None

        if not user or not user.is_active or not user.email_is_verified:
            time.sleep(random.normalvariate(1.5, 0.25))
            return Response(None, status=status.HTTP_204_NO_CONTENT)

        try:
            token = PasswordRecoveryToken.objects.get(
                email=email,
                expiry__gt=timezone.now(),
            )
        except PasswordRecoveryToken.DoesNotExist:
            try:
                token = PasswordRecoveryToken.objects.create(
                    email=email,
                    expiry=timedelta(minutes=10),
                )
            except Exception as e:
                logger.exception('Create reset token failed.', exc_info=e, extra={
                    'client_ip': request.META['CLIENT_IP'],
                    'command': AuthCommands.FORGOT_PW,
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


class ResetPasswordAPI(APIView):
    def post(self, request, format=None):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            token = check_reset_token(data['email'], data['token'])
        except:
            msg = "Oops, that didn't work! Perhaps this " \
                "link or this account are no longer valid."
            raise PermissionDenied(msg)

        user = User.objects.get(email=token.email)
        user.set_password(data['password'])
        user.save()
        InvalidLoginCache.delete(token.email)
        token.delete()

        return Response(None, status=status.HTTP_204_NO_CONTENT)


class VerifyEmailAPI(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, format=None):
        try:
            if throttle_command(
                AuthCommands.VERIFY_EMAIL, request.META['CLIENT_IP'], request,
            ):
                raise Throttled()
            try:
                token = EmailVerificationToken.objects.filter(
                    user=request.user, expiry__gt=timezone.now(),
                ).latest('expiry')
            except EmailVerificationToken.DoesNotExist:
                user = request.user
                token = EmailVerificationToken.objects.create(
                    user=user, expiry=timedelta(days=7),)
                send_verification_email(user.email, user.name, token[1])
        except Throttled as e:
            raise e
        except Exception as e:
            logger.exception(
                'Email verification error - GET', exc_info=e, extra={
                    'client_ip': request.META['CLIENT_IP'],
                    'command': AuthCommands.VERIFY_EMAIL,
                    'metadata': parse_request_metadata(request),
                },)
            raise RequestError()
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    def post(self, request, format=None):
        try:
            if throttle_command(
                AuthCommands.VERIFY_EMAIL, request.META['CLIENT_IP'], request,
            ):
                raise Throttled()

            user = request.user
            if user.email_is_verified:
                return Response(None, status=status.HTTP_204_NO_CONTENT)

            token_string = ''
            serializer = VerificationSerializer(data=request.data)
            if serializer.is_valid():
                token_string = serializer.validated_data['token']

            try:
                check_verification_token(
                    AuthCommands.VERIFY_EMAIL, request.user, token_string,)
            except:
                msg = "Oops, failed to verify your email address! " \
                    "Perhaps the email link is no longer valid."
                raise PermissionDenied(msg)

            user.email_is_verified = True
            user.save()
            user.email_verification_tokens.all().delete()

            return Response(None, status=status.HTTP_204_NO_CONTENT)
        except (PermissionDenied, Throttled) as e:
            raise e
        except Exception as e:
            logger.exception(
                'Email verification error - POST', exc_info=e, extra={
                    'client_ip': request.META['CLIENT_IP'],
                    'command': AuthCommands.VERIFY_EMAIL,
                    'metadata': parse_request_metadata(request),
                },)
            raise RequestError()