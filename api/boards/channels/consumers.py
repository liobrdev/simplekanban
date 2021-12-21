import logging
import re

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model

from boards.channels import actions
from boards.channels.exceptions import (
    BoardFailed, ClientError, ClientThrottled,
    DuplicateDisplayName, InviteNotSent,
    JoinFailed, MissingCommand, UserFailed,)
from boards.channels.mixins import ConsumerCommandsMixin
from boards.channels.utils import ChannelCodes
from boards.models import Board, BoardMembership
from boards.utils import BoardRoles, BoardCommands
from utils import parse_request_metadata
from utils.throttling import throttle_command


STAFF_ROLES = [BoardRoles.ADMIN, BoardRoles.MODERATOR]


class BoardConsumer(AsyncJsonWebsocketConsumer, ConsumerCommandsMixin):
    async def connect(self):
        if self.scope['user'].is_anonymous or not self.scope['user'].is_active:
            await self.close()
        else:
            await self.accept()

            try:
                self.client_ip = self.scope['client_ip']

                # Check if user logged in from board invitation
                self.invitation = None
                if not self.scope['invitation'].is_empty:
                    self.invitation = self.scope['invitation']

                # Authenticate user and get board
                self.user = await self.get_user_or_error(
                    self.scope['user'].user_slug,)
                self.board = await self.get_board_or_error()

                serialized_board = await database_sync_to_async(
                    actions._read_board,
                )(self.board, self.user)

                # Send serialized board to client, then add to channel layer
                await self.send_json({
                    'code': ChannelCodes.BOARD_LOADED,
                    'data': serialized_board,
                })
                await self.channel_layer.group_add(
                    self.board.group_name,
                    self.channel_name,
                )

                '''
                If successfully logged in from board invitation,
                update all other board members
                '''
                if self.invitation == 'success':
                    memberships = serialized_board['memberships']

                    await self.group_update(ChannelCodes.MEMBERS_SAVED, memberships)

                    # To activity log this
                    # msg = f'{self.user.name} has joined the board.'
                    # await self.create_activity_log(BoardCommands.JOIN, msg)
            except (BoardFailed, UserFailed) as e:
                await self.send_json(e.ws_error())
            except ClientError as e:
                await database_sync_to_async(actions._log_exception)(
                    __name__, e.message, e.exception,
                    {
                        'board': self.scope['url_route']['kwargs']['board_slug'],
                        'user': self.scope['user'].user_slug,
                        'client_ip': self.scope['client_ip'],
                        'metadata': parse_request_metadata(self.scope),
                    },
                )
                await self.send_json(e.ws_error())
            except Exception as e:
                error =  ClientError(e, code=ChannelCodes.SERVER)
                await database_sync_to_async(actions._log_exception)(
                    __name__, error.message, e,
                    {
                        'board': self.scope['url_route']['kwargs']['board_slug'],
                        'user': self.scope['user'].user_slug,
                        'client_ip': self.scope['client_ip'],
                        'metadata': parse_request_metadata(self.scope),
                    },
                )
                await self.send_json(error.ws_error())

    async def disconnect(self, close_code):
        if hasattr(self, 'board'):
            await self.channel_layer.group_discard(
                self.board.group_name,
                self.channel_name,
            )

    async def send_update(self, event):
        await self.send_json({
            'code': event['code'],
            'data': event['data'],
            'user': event['user'],
        })

    async def group_update(self, code, data=None):
        await self.channel_layer.group_send(self.board.group_name, {
            'type': 'send.update',
            'code': code,
            'data': data,
            'user': self.user.user_slug,
        })

    async def receive_json(self, content):
        try:
            try:
                command = content['command']
                missing = False
            except KeyError as e:
                command = BoardCommands.NO_COMMAND
                missing = MissingCommand(e)

            if await database_sync_to_async(throttle_command)(
                command,
                self.client_ip,
                self.scope,
                board=self.board.board_slug,
                user=self.user.user_slug,
            ):
                raise ClientThrottled(command=command)

            if missing:
                raise missing

            if command == BoardCommands.CREATE_MSG:
                await self.create_message(content, command)
            elif command == BoardCommands.TITLE:
                await self.update_board_title(content, command)
            elif command == BoardCommands.CREATE_TASK:
                await self.create_task(content, command)
            elif command == BoardCommands.UPDATE_TASK:
                await self.update_task(content, command)
            elif command == BoardCommands.MOVE_TASK:
                await self.move_task(content, command)
            elif command == BoardCommands.DELETE_TASK:
                await self.delete_task(content, command)
            elif command == BoardCommands.CREATE_COLUMN:
                await self.create_column(content, command)
            elif command == BoardCommands.UPDATE_COLUMN:
                await self.update_column(content, command)
            elif command == BoardCommands.MOVE_COLUMN:
                await self.move_column(content, command)
            elif command == BoardCommands.DELETE_COLUMN:
                await self.delete_column(content, command)
            elif command == BoardCommands.DISPLAY_NAME:
                await self.update_member_display_name(content, command)
            elif command == BoardCommands.ROLE:
                await self.update_member_role(content, command)
            elif command == BoardCommands.LEAVE:
                await self.leave_board(command)
            elif command == BoardCommands.REMOVE:
                await self.remove_member(content, command)
            elif command == BoardCommands.DELETE_BOARD:
                await self.delete_board(command)
            elif command == BoardCommands.INVITE:
                await self.invite_member(content, command)
            else:
                raise ClientError(message='Invalid command', command=command)
        except (ClientThrottled, InviteNotSent, DuplicateDisplayName) as e:
            e.user = self.user.user_slug
            await self.send_json(e.ws_error())
        except ClientError as e:
            e.user = self.user.user_slug
            await database_sync_to_async(actions._log_exception)(
                __name__, e.message, e.exception,
                {
                    'board': self.board.board_slug,
                    'user': e.user,
                    'client_ip': self.client_ip,
                    'command': e.command,
                    'metadata': parse_request_metadata(self.scope),
                },
            )
            await self.send_json(e.ws_error())
        except Exception as e:
            error = ClientError(
                e, code=ChannelCodes.SERVER, user=self.user.user_slug,)
            await database_sync_to_async(actions._log_exception)(
                __name__, error.message, e,
                {
                    'board': self.board.board_slug,
                    'user': self.user.user_slug,
                    'client_ip': self.client_ip,
                    'metadata': parse_request_metadata(self.scope),
                },
            )
            await self.send_json(error.ws_error())


    @database_sync_to_async
    def get_user_or_error(self, user_slug):
        try:
            return get_user_model().objects.get(user_slug=user_slug)
        except Exception as e:
            raise UserFailed(e)

    @database_sync_to_async
    def get_board_or_error(self):
        try:
            board = Board.objects.get(
                board_slug=self.scope['url_route']['kwargs']['board_slug'],)
        except Exception as e:
            raise BoardFailed(e)

        if (
            self.invitation and board.new_members_allowed and
            self.user and
            self.invitation.board == board and
            self.invitation.email == self.user.email
        ):
            # If invited, create board membership
            try:
                BoardMembership.objects.create(
                    board=board, user=self.user, role=BoardRoles.MEMBER,)
            except Exception as e:
                raise JoinFailed(e)

            # Delete invitation once member has joined
            try:
                actions._delete_invitation(
                    board,
                    self.user,
                    self.invitation,
                    self.client_ip,
                    self.scope,
                )
            except Exception as e:
                actions._log_exception(
                    __name__, 'Error deleting invitation.', e, {
                        'board': board.board_slug,
                        'user': self.user.user_slug,
                        'metadata': { 'invited': self.invitation.email },
                    },
                )

            board.refresh_from_db()
            self.invitation = 'success'

        if self.user not in board.users.all():
            raise BoardFailed(message='Board access denied')
        return board