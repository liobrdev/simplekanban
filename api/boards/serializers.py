from rest_framework.serializers import (
    ModelSerializer, BooleanField, PrimaryKeyRelatedField,)

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