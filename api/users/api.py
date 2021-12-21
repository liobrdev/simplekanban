import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from rest_framework import status
from rest_framework.exceptions import (
    PermissionDenied, Throttled, ValidationError,)
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from boards.channels.utils import ChannelCodes
from boards.serializers import BoardSerializer
from boards.utils import BoardRoles
from users.serializers import UserSerializer, UserDeactivateSerializer
from users.utils import UserCommands
from utils import parse_request_metadata
from utils.exceptions import RequestError
from utils.throttling import throttle_command

logger = logging.getLogger(__name__)


class UserAPI(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    lookup_field = 'user_slug'

    def get_object(self):
        user_slug = self.kwargs['user_slug']
        if self.request.user.user_slug == user_slug:
            return self.request.user
        raise PermissionDenied('User denied access.')

    def retrieve(self, request, *args, **kwargs):
        instance = self.request.user
        serializer = self.get_serializer(instance)
        headers = {
            'Access-Control-Expose-Headers': 'X-Client-Ip',
            'X-Client-Ip': request.META['CLIENT_IP'],
        }
        return Response(serializer.data, headers=headers)

    def destroy(self, request, *args, **kwargs):
        try:
            if throttle_command(
                UserCommands.DEACTIVATE, request.META['CLIENT_IP'], request,
            ):
                raise Throttled()
            serializer = UserDeactivateSerializer(
                data=request.data, context={ 'request': request },)
            serializer.is_valid(raise_exception=True)
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            raise e
        except PermissionDenied as e:
            logger.exception('User denied access.', exc_info=e, extra={
                'user': request.user.user_slug,
                'command': UserCommands.DEACTIVATE,
                'client_ip': request.META['CLIENT_IP'],
                'metadata': parse_request_metadata(request),
            })
            raise e
        except Exception as e:
            logger.exception('Error destroying user.', exc_info=e, extra={
                'user': request.user.user_slug,
                'command': UserCommands.DEACTIVATE,
                'client_ip': request.META['CLIENT_IP'],
                'metadata': parse_request_metadata(request),
            })
            raise RequestError('Error deactivating account.')

    def update(self, request, *args, **kwargs):
        try:
            if throttle_command(
                UserCommands.UPDATE, request.META['CLIENT_IP'], request,
            ):
                raise Throttled()
            return super().update(request, *args, **kwargs)
        except ValidationError as e:
            if hasattr(e, 'detail') and isinstance(e.detail, dict):
                for key, value in e.detail.items():
                    if value == ['This field may not be blank.']:
                        logger.exception('Blank user update.', exc_info=e, extra={
                            'user': request.user.user_slug,
                            'command': UserCommands.UPDATE,
                            'client_ip': request.META['CLIENT_IP'],
                            'metadata': parse_request_metadata(request),
                        })
                        break
                    if key == 'password' and value == [
                        'This password is too short. '
                        'It must contain at least 8 characters.',
                    ]:
                        logger.exception('Short password.', exc_info=e, extra={
                            'user': request.user.user_slug,
                            'command': UserCommands.UPDATE,
                            'client_ip': request.META['CLIENT_IP'],
                            'metadata': parse_request_metadata(request),
                        })
                        break
            raise e
        except PermissionDenied as e:
            logger.exception('User denied access.', exc_info=e, extra={
                'user': request.user.user_slug,
                'command': UserCommands.UPDATE,
                'client_ip': request.META['CLIENT_IP'],
                'metadata': parse_request_metadata(request),
            })
            raise e
        except Exception as e:
            logger.exception('Error updating user.', exc_info=e, extra={
                'user': request.user.user_slug,
                'command': UserCommands.UPDATE,
                'client_ip': request.META['CLIENT_IP'],
                'metadata': parse_request_metadata(request),
            })
            raise RequestError('Error updating account.')

    def perform_destroy(self, instance):
        '''
        Clean up board memberships after deactivating user account.

        If user is the admin of a board, alert any others and delete the board.

        If user is not the admin of a board, just delete membership and alert
        remaining members.
        '''

        instance.is_active = False
        instance.auth_token_set.all().delete()
        instance.save()
        memberships = instance.memberships.all()
        for membership in memberships.iterator():
            if membership.role == BoardRoles.ADMIN:
                self._alert_group_board_deleted(membership.board)
            else:
                self._alert_group_member_deleted(membership)

    def perform_update(self, serializer):
        instance = serializer.save()
        data = self.request.data.keys()
        if 'email' in data or 'name' in data:
            memberships = instance.memberships.all()
            for membership in memberships.iterator():
                board = membership.board
                other_members = board.memberships.exclude(user=instance)
                if other_members:
                    self._alert_group_member_updated(membership)

    def _alert_group_board_deleted(self, board):
        group_name = board.group_name
        num, obj = board.delete()
        if num >= 1 and obj.get('boards.Board', 0) == 1:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(group_name, {
                'type': 'send.update',
                'code': ChannelCodes.BOARD_DELETED,
                'data': 'Project deleted',
                'user': self.request.user.user_slug,
            })

    def _alert_group_member_deleted(self, membership):
        board = membership.board
        deleted = membership.delete()
        if deleted == (1, { 'boards.BoardMembership': 1 }):
            serialized_board = BoardSerializer(
                board,
                context=dict(request=self.request),
            ).data
            memberships = serialized_board['memberships']

            channel_layer = get_channel_layer()
            group_name = board.group_name
            async_to_sync(channel_layer.group_send)(group_name, {
                'type': 'send.update',
                'code': ChannelCodes.MEMBERS_SAVED,
                'data': memberships,
                'user': self.request.user.user_slug,
            })

    def _alert_group_member_updated(self, membership):
        serialized_board = BoardSerializer(
            membership.board,
            context=dict(request=self.request),
        ).data
        memberships = serialized_board['memberships']

        channel_layer = get_channel_layer()
        group_name = membership.board.group_name
        async_to_sync(channel_layer.group_send)(group_name, {
            'type': 'send.update',
            'code': ChannelCodes.MEMBERS_SAVED,
            'data': memberships,
            'user': self.request.user.user_slug,
        })