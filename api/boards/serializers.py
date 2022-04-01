from django.db import transaction

from rest_framework.exceptions import ValidationError
from rest_framework.serializers import (
    ModelSerializer, Serializer, BooleanField, CharField, DictField, ListField,
    PrimaryKeyRelatedField,)

from boards.models import Board, BoardMembership, BoardMessage
from activity_logs.models import ActivityLog
from columns.models import Column
from tasks.models import Task
from users.serializers import ReadOnlyUserSerializer


class BoardField(PrimaryKeyRelatedField):
    def get_queryset(self):
        try:
            request = self.context.get('request')
            user = request['user']
            queryset = user.boards.all()
        except:
            queryset = Board.objects.all()
        return queryset


class ColumnField(PrimaryKeyRelatedField):
    def get_queryset(self):
        try:
            request = self.context.get('request')
            board = request['board']
            queryset = board.columns.all()
        except:
            queryset = Column.objects.all()
        return queryset


class TaskField(PrimaryKeyRelatedField):
    def get_queryset(self):
        try:
            request = self.context.get('request')
            board = request['board']
            queryset = board.tasks.all()
        except:
            queryset = Task.objects.all()
        return queryset


class ColumnSerializer(ModelSerializer):
    board = BoardField()

    class Meta:
        model = Column
        fields = [
            'board', 'column_id', 'column_index', 'column_title',
            'wip_limit', 'wip_limit_on', 'updated_at',]
        read_only_fields = ['updated_at']


class TaskSerializer(ModelSerializer):
    board = BoardField()
    column = ColumnField()

    class Meta:
        model = Task
        fields = [
            'board', 'column', 'task_id', 'task_index',
            'text', 'updated_at',]
        read_only_fields = ['updated_at']


class ActivityLogSerializer(ModelSerializer):
    board = BoardField()
    task = TaskField()

    class Meta:
        model = ActivityLog
        fields = ['board', 'task', 'command', 'msg', 'created_at']
        read_only_fields = ['created_at']


class BoardMessageSerializer(ModelSerializer):
    board = BoardField()
    sender = ReadOnlyUserSerializer()

    class Meta:
        model = BoardMessage
        fields = [
            'board', 'msg_id', 'sender',
            'message', 'created_at', 'updated_at',]
        read_only_fields = ['created_at', 'updated_at']


class BoardMembershipSerializer(ModelSerializer):
    board = BoardField()
    user = ReadOnlyUserSerializer()

    class Meta:
        model = BoardMembership
        fields = ['board', 'user', 'role', 'display_name', 'created_at']
        read_only_fields = ['created_at']


class BoardThumbSerializer(ModelSerializer):
    class Meta:
        model = Board
        fields = ['board_slug', 'board_title']
        read_only_fields = ['board_slug', 'board_title']


class ListBoardSerializer(ModelSerializer):
    board = BoardThumbSerializer()

    class Meta:
        model = BoardMembership
        fields = ['board', 'created_at']
        read_only_fields = ['board', 'created_at']


class DemoSerializer(Serializer):
    board_title = CharField(write_only=True, max_length=255)
    columns = ListField(child=DictField(allow_empty=False), write_only=True)
    tasks = ListField(child=DictField(allow_empty=False), write_only=True)

    def validate_columns(self, columns: 'list[dict]'):
        for column in columns:
            try:
                column_id = column['column_id']
                column_title = column['column_title'].strip()
                column_index = column['column_index']
                wip_limit_on = column['wip_limit_on']
                wip_limit = column['wip_limit']
                column.pop('board')
                column.pop('updated_at')

                if not isinstance(column_id, int):
                    raise TypeError('column_id')
                if not column_title:
                    raise ValueError('column_title cannot be empty')
                if len(column_title) > 255:
                    raise ValueError('column_title cannot be longer than 255 chars')
                if not isinstance(column_index, int):
                    raise ValueError('column_index')
                if not isinstance(wip_limit_on, bool):
                    raise TypeError('wip_limit_on')
                if not isinstance(wip_limit, int):
                    raise TypeError('wip_limit')
                if not wip_limit:
                    raise ValueError('wip_limit')
            except (KeyError, AttributeError, TypeError, ValueError) as e:
                raise ValidationError(f'Invalid column: {e.args[0]}')
        return columns

    def validate_tasks(self, tasks: 'list[dict]'):
        for task in tasks:
            try:
                column = task['column']
                text = task['text'].strip()
                task_index = task['task_index']
                task.pop('board')
                task.pop('task_id')
                task.pop('updated_at')

                if not isinstance(column, int):
                    raise TypeError('column')
                if not column:
                    raise ValueError('column')
                if not text:
                    raise ValueError('text cannot be empty')
                if len(text) > 255:
                    raise ValueError('text cannot be longer than 255 chars')
                if not isinstance(task_index, int):
                    raise ValueError('task_index')
            except (KeyError, AttributeError, TypeError, ValueError) as e:
                raise ValidationError(f'Invalid task: {e.args[0]}')
        return tasks

    def create(self, validated_data):
        board_title = validated_data['board_title']
        columns = validated_data['columns']
        tasks = validated_data['tasks']
        messages_allowed = validated_data['messages_allowed']
        new_members_allowed = validated_data['new_members_allowed']

        with transaction.atomic():
            board = Board.objects.create(
                board_title=board_title, messages_allowed=messages_allowed,
                new_members_allowed=new_members_allowed,)

            with transaction.atomic():
                for c in columns:
                    column = Column.objects.create(
                        board=board, column_title=c['column_title'],
                        column_index=c['column_index'],
                        wip_limit=c['wip_limit'],
                        wip_limit_on=c['wip_limit_on'],)

                    for t in tasks:
                        if t['column'] == c['column_id']:
                            Task.objects.create(
                                board=board, column=column, text=t['text'],
                                task_index=t['task_index'],)

            return board
        

class BoardSerializer(ModelSerializer):
    columns = ColumnSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    activity_logs = ActivityLogSerializer(many=True, read_only=True)
    memberships = BoardMembershipSerializer(many=True, read_only=True)
    messages = BoardMessageSerializer(many=True, read_only=True)
    messages_allowed = BooleanField(read_only=True)
    new_members_allowed = BooleanField(read_only=True)

    class Meta:
        model = Board
        fields = [
            'board_slug', 'board_title', 'columns', 'tasks',
            'activity_logs', 'memberships', 'messages',
            'created_at', 'updated_at',
            'messages_allowed', 'new_members_allowed',]
        read_only_fields = ['created_at', 'updated_at']
