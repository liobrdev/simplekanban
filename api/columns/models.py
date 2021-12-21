from django.db.models import (
    AutoField, BooleanField, CharField, ForeignKey,
    PositiveSmallIntegerField, CASCADE,)

from boards.models import Board
from columns.managers import ColumnManager
from utils.models import CustomBaseMixin


class Column(CustomBaseMixin):
    board = ForeignKey(
        Board,
        on_delete=CASCADE,
        related_name='columns',
        editable=False,)
    column_id = AutoField(primary_key=True, editable=False)
    column_index = PositiveSmallIntegerField()
    column_title = CharField(max_length=255)
    wip_limit_on = BooleanField(default=True)
    wip_limit = PositiveSmallIntegerField(default=5)

    objects = ColumnManager()

    class Meta:
        ordering = ['board', 'column_index']

    def __str__(self):
        return f'<{self.board}>[{self.column_title}]'

    def save(self, *args, **kwargs):
        if not self.column_id:
            self.column_index = self.board.columns.count()
        super(Column, self).save(*args, **kwargs)