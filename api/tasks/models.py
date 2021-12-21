from django.db.models import (
    AutoField, BooleanField, CharField, PositiveSmallIntegerField,
    ForeignKey, CASCADE, Index, UniqueConstraint,)

from boards.models import Board
from columns.models import Column
from tasks.managers import TaskManager
from utils.models import CustomBaseMixin


class Task(CustomBaseMixin):
    board = ForeignKey(
        Board,
        on_delete=CASCADE,
        related_name='tasks',
        editable=False,)
    column = ForeignKey(Column, on_delete=CASCADE, related_name='tasks')
    is_archived = BooleanField(default=False)
    task_id = AutoField(primary_key=True, editable=False)
    task_index = PositiveSmallIntegerField()
    text = CharField(max_length=255)

    objects = TaskManager()

    class Meta:
        ordering = ['board', 'column', 'task_index']

    def __str__(self):
        return (
            f'<{self.board.board_title}>[{self.column.column_title}]:'
            f'"{self.text}"'
        )

    def save(self, *args, **kwargs):
        if not self.task_id:
            self.task_index = self.column.tasks.count()
        super(Task, self).save(*args, **kwargs)