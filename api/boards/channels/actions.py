import logging

from datetime import datetime

from django.db import IntegrityError

from boards.channels.exceptions import ClientError, DuplicateDisplayName
from boards.models import Board, BoardMessage, BoardMembership
from boards.serializers import (
    BoardSerializer,
    BoardMessageSerializer,
    BoardMembershipSerializer,
    ColumnSerializer,
    TaskSerializer,
)
from boards.utils import BoardRoles, BoardCommands
from columns.models import Column
from invitations.models import Invitation
from tasks.models import Task
from utils import parse_request_metadata


def _read_board(board, user):
    try:
        context = dict(request=dict(board=board, user=user))
        return BoardSerializer(board, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Could not read board',
            command=BoardCommands.READ_BOARD,
        )

def _update_board_title(board, user, board_title):
    try:
        instance = Board.objects.get(board_slug=board.board_slug)
        instance.board_title = board_title
        instance.save(update_fields=['board_title', 'updated_at'])
        context = dict(request=dict(board=board, user=user))
        return BoardSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Board title not updated',
            command=BoardCommands.TITLE,
        )

def _create_msg(board, user, message):
    try:
        instance = BoardMessage.objects.create(
            board=board, sender=user, message=message,)
        context = dict(request=dict(board=board, user=user))
        return BoardMessageSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Message not created',
            command=BoardCommands.CREATE_MSG,
        )

def _update_msg(board, user, msg_id, message):
    try:
        instance = BoardMessage.objects.get(msg_id=msg_id)
        instance.message = message
        instance.save(update_fields=['message', 'updated_at'])
        context = dict(request=dict(board=board, user=user))
        return BoardMessageSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Message not updated',
            command=BoardCommands.UPDATE_MSG,
        )

def _create_column(board, user, **data):
    try:
        instance = Column.objects.create(board=board, **data)
        context = dict(request=dict(board=board, user=user))
        return ColumnSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Column not created',
            command=BoardCommands.CREATE_COLUMN,
        )

def _update_column(board, user, column_id, **data):
    try:
        instance = Column.objects.get(column_id=column_id)
        instance.column_title = data.get('column_title', instance.column_title)
        instance.wip_limit_on = data.get('wip_limit_on', instance.wip_limit_on)
        instance.wip_limit = data.get('wip_limit', instance.wip_limit)
        instance.save()
        context = dict(request=dict(board=board, user=user))
        return ColumnSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Column not updated',
            command=BoardCommands.UPDATE_COLUMN,
        )

def _move_column(board, user, column_id, column_index):
    try:
        column = Column.objects.get(column_id=column_id)
        instance = Column.objects.move(column, column_index)
        context = dict(request=dict(board=board, user=user))
        return ColumnSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Column not moved',
            command=BoardCommands.MOVE_COLUMN,
        )

def _create_task(board, user, column_id, text):
    try:
        column = Column.objects.get(column_id=column_id)
        instance = Task.objects.create(board=board, column=column, text=text)
        context = dict(request=dict(board=board, user=user))
        return TaskSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Task not created',
            command=BoardCommands.CREATE_TASK,
        )

def _update_task(board, user, task_id, text):
    try:
        instance = Task.objects.get(task_id=task_id)
        instance.text = text
        instance.save(update_fields=['text', 'updated_at'])
        context = dict(request=dict(board=board, user=user))
        return TaskSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Task not updated',
            command=BoardCommands.UPDATE_TASK,
        )

def _move_task(board, user, task_id, column_id, task_index):
    try:
        task = Task.objects.get(task_id=task_id)
        instance = Task.objects.move(task, column_id, task_index)
        context = dict(request=dict(board=board, user=user))
        return TaskSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Task not moved',
            command=BoardCommands.MOVE_TASK,)

def _update_member_role(board, user, role):
    try:
        instance = BoardMembership.objects.get(board=board, user=user)
        instance.role = role
        instance.save(update_fields=['role', 'updated_at'])
        context = dict(request=dict(board=board, user=user))
        return BoardMembershipSerializer(instance, context=context).data
    except Exception as e:
        raise ClientError(
            e,
            message='Member role not updated',
            command=BoardCommands.ROLE,
        )

def _update_member_display_name(board, user, display_name):
    try:
        instance = BoardMembership.objects.get(board=board, user=user)
        instance.display_name = display_name
        instance.save(update_fields=['display_name', 'updated_at'])
        context = dict(request=dict(board=board, user=user))
        return BoardMembershipSerializer(instance, context=context).data
    except IntegrityError as e:
        raise DuplicateDisplayName(e)
    except Exception as e:
        raise ClientError(
            e,
            message='Member display_name not updated',
            command=BoardCommands.DISPLAY_NAME,
        )

def _remove_member(board, user, command=BoardCommands.REMOVE):
    try:
        deleted = BoardMembership.objects.get(board=board, user=user).delete()
        if deleted != (1, { 'boards.BoardMembership': 1 }):
            raise
    except Exception as e:
        raise ClientError(
            e,
            message='Member not removed from board',
            command=command,
        )

def _delete_board(board_slug):
    try:
        num, obj = Board.objects.get(board_slug=board_slug).delete()
        if num < 1 or obj.get('boards.Board', 0) != 1:
            raise
    except Exception as e:
        raise ClientError(
            e,
            message='Board not deleted',
            command=BoardCommands.DELETE_BOARD,
        )

def _delete_column(column_id):
    try:
        instance = Column.objects.get(column_id=column_id)
        num, obj = Column.objects.delete(instance)
        if num < 1 or obj.get('columns.Column') != 1:
            raise
    except Exception as e:
        raise ClientError(
            e,
            message='Column not deleted',
            command=BoardCommands.DELETE_COLUMN,
        )

def _delete_task(task_id):
    try:
        instance = Task.objects.get(task_id=task_id)
        deleted = Task.objects.delete(instance)
        if deleted != (1, { 'tasks.Task': 1 }):
            raise
    except Exception as e:
        raise ClientError(
            e,
            message='Task not deleted',
            command=BoardCommands.DELETE_TASK,
        )

def _create_invitation(board, email):
    try:
        return Invitation.objects.create(board=board, email=email)
    except Exception as e:
        raise ClientError(e, message='Invitation not created')

def _delete_invitation(board, user, invitation, client_ip=None, context=None):
    try:
        invitation.delete()
    except Exception as e:
        log_exception(__name__, 'Error deleting invitation.', e, {
            'board': board.board_slug,
            'user': user.user_slug,
            'client_ip': client_ip,
            'command': BoardCommands.INVITE,
            'metadata': parse_request_metadata(context, {
                'invited': invitation.email,
            }),
        })

def _get_member_role(board, user):
    try:
        return BoardMembership.objects.get(board=board, user=user).role
    except Exception as e:
        raise ClientError(e, message='Could not get member role')

def _log_exception(name, msg, exc_info=False, extra=None):
    logger = logging.getLogger(name)
    logger.exception(msg, exc_info=exc_info, extra=extra)