import re

from channels.db import database_sync_to_async
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from urllib import parse

from boards.channels import actions
from boards.channels.exceptions import (
    ClientError, InvalidContent, InviteFailed, InviteNotSent, NotAllowed,)
from boards.channels.utils import ChannelCodes
from boards.utils import BoardRoles
from invitations.models import InviteToken
from utils import email_regex


ADMIN_ONLY_ROLES = [BoardRoles.ADMIN]
STAFF_ROLES = [BoardRoles.ADMIN, BoardRoles.MODERATOR]
NON_ADMIN_ROLES = [BoardRoles.MODERATOR, BoardRoles.MEMBER]


class ConsumerCommandsMixin:
    async def check_is_staff(self, user, command=None, admin_only=False):
        if admin_only:
            roles = ADMIN_ONLY_ROLES
        else:
            roles = STAFF_ROLES

        role = await database_sync_to_async(
            actions._get_member_role,
        )(self.board, user)

        if not role in roles:
            raise NotAllowed(command=command)
        return

    async def check_is_not_admin(self, user, command=None):
        role = await database_sync_to_async(
            actions._get_member_role,
        )(self.board, user)

        if role == BoardRoles.ADMIN:
            raise NotAllowed(command=command)
        return

    async def update_board_title(self, content, command):
        await self.check_is_staff(self.user, command, admin_only=True)

        try:
            board_title = content['board_title'].strip()

            if not board_title:
                raise ValueError('board_title cannot be empty')
            if len(board_title) > 255:
                raise ValueError('board_title cannot be longer than 255 chars')
        except (KeyError, AttributeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        board = await database_sync_to_async(
            actions._update_board_title,
        )(self.board, self.user, board_title)

        await self.group_update(ChannelCodes.BOARD_UPDATED, board)

    async def create_message(self, content, command):
        if not self.board.messages_allowed:
            raise NotAllowed(command=command)

        try:
            board_msg = content['board_msg'].strip()

            if not board_msg:
                raise ValueError('board_msg cannot be empty')
            if len(board_msg) > 255:
                raise ValueError('board_msg cannot be longer than 255 chars')
        except (KeyError, AttributeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        msg = await database_sync_to_async(
            actions._create_msg,
        )(self.board, self.user, board_msg)

        await self.group_update(ChannelCodes.MSG_CREATED, msg)

    async def create_task(self, content, command):
        try:
            column_id = content['column_id']
            text = content['text'].strip()

            if not isinstance(column_id, int):
                raise TypeError('column_id')
            if not column_id:
                raise ValueError('column_id')
            if not text:
                raise ValueError('text cannot be empty')
            if len(text) > 255:
                raise ValueError('text cannot be longer than 255 chars')
        except (KeyError, AttributeError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        await database_sync_to_async(
            actions._create_task,
        )(self.board, self.user, column_id, text)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        tasks = serialized_board['tasks']

        await self.group_update(ChannelCodes.TASKS_SAVED, tasks)

    async def update_task(self, content, command):
        try:
            task_id = content['task_id']
            text = content['text'].strip()

            if not isinstance(task_id, int):
                raise TypeError('task_id')
            if not task_id:
                raise ValueError('task_id')
            if not text:
                raise ValueError('text cannot be empty')
            if len(text) > 255:
                raise ValueError('text cannot be longer than 255 chars')
        except (KeyError, AttributeError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        await database_sync_to_async(
            actions._update_task,
        )(self.board, self.user, task_id, text)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        tasks = serialized_board['tasks']

        await self.group_update(ChannelCodes.TASKS_SAVED, tasks)

    async def move_task(self, content, command):
        try:
            task_id = content['task_id']
            column_id = content['column_id']
            task_index = content['task_index']

            if not isinstance(task_id, int):
                raise TypeError('task_id')
            if not task_id:
                raise ValueError('task_id')
            if not isinstance(column_id, int):
                raise TypeError('column_id')
            if not column_id:
                raise ValueError('column_id')
            if not isinstance(task_index, int):
                raise TypeError('task_index')
        except (KeyError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        await database_sync_to_async(
            actions._move_task,
        )(self.board, self.user, task_id, column_id, task_index)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        tasks = serialized_board['tasks']

        await self.group_update(ChannelCodes.TASKS_SAVED, tasks)

    async def delete_task(self, content, command):
        try:
            task_id = content['task_id']

            if not isinstance(task_id, int):
                raise TypeError('task_id')
            if not task_id:
                raise ValueError('task_id')
        except (KeyError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        await database_sync_to_async(actions._delete_task)(task_id)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        tasks = serialized_board['tasks']

        deleted_task = next((
            task for task in tasks if task['task_id'] == task_id
        ), None)

        await self.group_update(ChannelCodes.TASKS_SAVED, tasks)

    async def create_column(self, content, command):
        await self.check_is_staff(self.user, command)

        try:
            column_title = content['column_title'].strip()
            wip_limit_on = content['wip_limit_on']
            wip_limit = content['wip_limit']

            if not column_title:
                raise ValueError('column_title cannot be empty')
            if len(column_title) > 255:
                raise ValueError('column_title cannot be longer than 255 chars')
            if not isinstance(wip_limit_on, bool):
                raise TypeError('wip_limit_on')
            if not isinstance(wip_limit, int):
                raise TypeError('wip_limit')
            if not wip_limit:
                raise ValueError('wip_limit')
        except (KeyError, AttributeError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        await database_sync_to_async(
            actions._create_column,
        )(
            self.board,
            self.user,
            column_title=column_title,
            wip_limit_on=wip_limit_on,
            wip_limit=wip_limit,
        )

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        columns = serialized_board['columns']

        await self.group_update(ChannelCodes.COLUMNS_SAVED, columns)

    async def update_column(self, content, command):
        await self.check_is_staff(self.user, command)

        try:
            column_id = content['column_id']
            column_title = content.get('column_title')
            wip_limit_on = content.get('wip_limit_on')
            wip_limit = content.get('wip_limit')

            if not isinstance(column_id, int):
                raise TypeError('column_id')
            if not column_id:
                raise ValueError('column_id')
        except (KeyError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        kwargs = dict()

        if column_title and isinstance(column_title, str):
            kwargs['column_title'] = column_title.strip()
        if isinstance(wip_limit_on, bool):
            kwargs['wip_limit_on'] = wip_limit_on
        if wip_limit and isinstance(wip_limit, int):
            kwargs['wip_limit'] = wip_limit

        await database_sync_to_async(
            actions._update_column,
        )(self.board, self.user, column_id, **kwargs)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        columns = serialized_board['columns']

        await self.group_update(ChannelCodes.COLUMNS_SAVED, columns)

    async def move_column(self, content, command):
        await self.check_is_staff(self.user, command)

        try:
            column_id = content['column_id']
            column_index = content['column_index']

            if not isinstance(column_id, int):
                raise TypeError('column_id')
            if not column_id:
                raise ValueError('column_id')
            if not isinstance(column_index, int):
                raise TypeError('column_index')
        except (KeyError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        await database_sync_to_async(
            actions._move_column,
        )(self.board, self.user, column_id, column_index)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        columns = serialized_board['columns']

        await self.group_update(ChannelCodes.COLUMNS_SAVED, columns)

    async def delete_column(self, content, command):
        await self.check_is_staff(self.user, command)

        try:
            column_id = content['column_id']

            if not isinstance(column_id, int):
                raise TypeError('column_id')
            if not column_id:
                raise ValueError('column_id')
        except (KeyError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        await database_sync_to_async(actions._delete_column)(column_id)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        columns = serialized_board['columns']

        await self.group_update(ChannelCodes.COLUMNS_SAVED, columns)

    async def update_member_role(self, content, command):
        await self.check_is_staff(self.user, command, admin_only=True)

        try:
            user_slug = content['user_slug']
            role = content['role']

            if role not in NON_ADMIN_ROLES:
                raise ValueError(f'role cannot be "{role}"')
            if not re.search(r'^[\w-]{10}$', user_slug):
                raise ValueError('user_slug')
            if user_slug == self.user.user_slug:
                raise NotAllowed(message='Cannot update own role')
        except (KeyError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        member = await self.get_user_or_error(user_slug)
        membership = await database_sync_to_async(
            actions._update_member_role,
        )(self.board, member, role)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        memberships = serialized_board['memberships']

        await self.group_update(ChannelCodes.MEMBERS_SAVED, {
            'updated_slugs': [user_slug],
            'members': memberships,
        })

    async def update_member_display_name(self, content, command):
        try:
            display_name = content['display_name']

            if len(display_name) > 255:
                raise ValueError('display_name cannot be longer than 255 chars')
        except (KeyError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        membership = await database_sync_to_async(
            actions._update_member_display_name,
        )(self.board, self.user, display_name)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        memberships = serialized_board['memberships']

        await self.group_update(ChannelCodes.MEMBERS_SAVED, memberships)

    async def leave_board(self, command):
        await self.check_is_not_admin(self.user, command)

        await database_sync_to_async(
            actions._remove_member,
        )(self.board, self.user, command)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        memberships = serialized_board['memberships']

        await self.group_update(ChannelCodes.MEMBERS_SAVED, memberships)

    async def remove_member(self, content, command):
        await self.check_is_staff(self.user, command, admin_only=True)

        try:
            user_slug = content['user_slug']

            if not re.search(r'^[\w-]{10}$', user_slug):
                raise ValueError('user_slug')
            if user_slug == self.user.user_slug:
                raise NotAllowed(message='Cannot remove admin')
        except (KeyError, TypeError, ValueError) as e:
            raise InvalidContent(e, command=command)

        member = await self.get_user_or_error(user_slug)
        await database_sync_to_async(
            actions._remove_member,
        )(self.board, member, command)

        serialized_board = await database_sync_to_async(
            actions._read_board,
        )(self.board, self.user)

        memberships = serialized_board['memberships']

        await self.group_update(ChannelCodes.MEMBERS_SAVED, memberships)

    async def delete_board(self, command):
        await self.check_is_staff(self.user, command, admin_only=True)

        await database_sync_to_async(
            actions._delete_board,
        )(self.board.board_slug)

        await self.group_update(ChannelCodes.BOARD_DELETED, 'Project deleted')

    async def invite_member(self, content, command):
        await self.check_is_staff(self.user, command)

        if self.board.new_members_allowed:
            try:
                email = content['invite_email'].strip().lower()

                if not re.search(email_regex(), email):
                    raise ValueError('invite_email')
            except (KeyError, AttributeError, TypeError, ValueError) as e:
                raise InvalidContent(e, command=command)

            if await self.check_member_can_be_invited(email):
                invitation = await database_sync_to_async(
                    actions._create_invitation,
                )(self.board, email)

                subject = (
                    f'{self.user.name} has invited you to '
                    f'collaborate with SimpleKanban!')

                link = await self.get_invite_link(invitation)

                html_message = render_to_string(
                    'email_invite.html',
                    {
                        'board_title': self.board.board_title,
                        'invite_link': link,
                    },
                )

                plain_message = strip_tags(html_message)

                try:
                    invite_sent = await self.send_invite(
                        subject, plain_message, email, html_message,)
                except Exception as e:
                    await database_sync_to_async(
                        actions._delete_invitation,
                    )(
                        self.board,
                        self.user,
                        invitation,
                        self.client_ip,
                        self.scope,
                    )
                    raise InviteFailed(e)

                if invite_sent:
                    message = f'Invitation sent to {email}'
                    await self.send_json({
                        'code': ChannelCodes.INVITE_SENT,
                        'message': message,
                        'user': self.user.user_slug,
                    })
                else:
                    await database_sync_to_async(
                        actions._delete_invitation,
                    )(
                        self.board,
                        self.user,
                        invitation,
                        self.client_ip,
                        self.scope,
                    )
                    raise InviteFailed()
            else:
                raise InviteFailed()
        else:
            raise NotAllowed(command=command)

    @database_sync_to_async
    def check_member_can_be_invited(self, email):
        current_members = self.board.users
        members_invited = self.board.invitations

        if current_members.count() + members_invited.count() >= 25:
            message = (
                'This project may not exceed 25 '
                'active or invited members.')
            raise InviteNotSent(message=message)
        if current_members.filter(email=email, is_active=True):
            message = (
                'User with this email is already a '
                'member of this project.')
            raise InviteNotSent(message=message)
        if members_invited.filter(email=email):
            message = (
                'Invitation has already been '
                'sent to this email.')
            raise InviteNotSent(message=message)
        return True

    @database_sync_to_async
    def get_invite_link(self, invitation):
        try:
            token = InviteToken.objects.create(invitation, timedelta(days=7))
        except Exception as e:
            raise ClientError(e, message='Create invite token failed')
        board_slug = token[0].invitation.board.board_slug
        invite_token = parse.quote(token[1])
        invite_email = parse.quote(token[0].invitation.email)

        protocol = 'http'
        if not settings.DEBUG:
            protocol += 's'

        return (
            f'{protocol}://{settings.DOMAIN}/invitation'
            f'?board={board_slug}&token={invite_token}&email={invite_email}'
        )

    @database_sync_to_async
    def send_invite(self, subject, message, recipient, html_message):
        return send_mail(
            subject,
            message,
            'invitation@simplekanban.app',
            [recipient],
            html_message=html_message,
        )