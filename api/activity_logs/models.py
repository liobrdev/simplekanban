from django.db.models import CharField, ForeignKey, CASCADE, SET_NULL

from boards.models import Board
from boards.utils import BoardCommands
from tasks.models import Task
from utils.models import CustomBaseMixin


class ActivityLog(CustomBaseMixin):
    board = ForeignKey(
        Board,
        on_delete=CASCADE,
        related_name='activity_logs',
        editable=False,)
    task = ForeignKey(
        Task,
        on_delete=SET_NULL,
        related_name='activity_logs',
        null=True,
        editable=False,)
    command = CharField(
        choices=BoardCommands.choices,
        null=True,
        max_length=255,
        editable=False,)
    msg = CharField(max_length=255)

    class Meta:
        ordering = ['-created_at']