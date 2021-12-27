from datetime import datetime

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import (
    AutoField, BooleanField, CharField, PositiveSmallIntegerField, SlugField,
    ForeignKey, ManyToManyField, CASCADE, PROTECT, Index, UniqueConstraint, Q,)
from rest_framework.reverse import reverse

from boards.exceptions import BoardIsFull, NewMembersNotAllowed
from boards.utils import BoardRoles
from utils.models import CustomBaseMixin, generate_slug


class Board(CustomBaseMixin):
    board_slug = SlugField(
        primary_key=True,
        editable=False,
        default=generate_slug,)
    board_title = CharField(max_length=255)
    messages_allowed = BooleanField(default=False)
    new_members_allowed = BooleanField(default=False)
    users = ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='boards',
        through='BoardMembership',)

    class Meta:
        ordering = ['-updated_at']

    @property
    def group_name(self):
        return f'board.{self.board_slug}'

    def __str__(self):
        return f'{self.group_name} "{self.board_title}"'

    def get_absolute_url(self):
        return reverse('board', kwargs=dict(board_slug=self.board_slug))


class BoardMembership(CustomBaseMixin):
    board = ForeignKey(
        Board,
        on_delete=CASCADE,
        related_name='memberships',
        editable=False,)
    user = ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=PROTECT,
        related_name='memberships',
        editable=False,)
    role = PositiveSmallIntegerField(choices=BoardRoles.choices)
    display_name = CharField(max_length=255, blank=True, default='')

    class Meta:
        constraints = [
            # No duplicate members on a single board
            UniqueConstraint(
                fields=['board', 'user'],
                name='unique_member',),

            # No duplicate admins on a single board
            UniqueConstraint(
                fields=['board', 'role'],
                condition=Q(role=BoardRoles.ADMIN),
                name='unique_admin',),

            # No duplicate display_name other than '' on a single board
            UniqueConstraint(
                fields=['board', 'display_name'],
                condition=~Q(display_name=''),
                name='unique_display_name',)
        ]
        indexes = [Index(fields=['board', 'user'])]

    def save(self, *args, **kwargs):
        users = self.board.users.all()
        if self.user not in users:
            if not self.board.new_members_allowed:
                raise NewMembersNotAllowed()
            if users.count() >= 25:
                raise BoardIsFull(25)
        super().save(*args, **kwargs)


class BoardMessage(CustomBaseMixin):
    msg_id = AutoField(primary_key=True, editable=False)
    board = ForeignKey(
        Board,
        on_delete=CASCADE,
        related_name='messages',
        editable=False,)
    sender = ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=PROTECT,
        related_name='messages_sent',
        editable=False,)
    message = CharField(max_length=255)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return (
            f'{datetime.timestamp(self.created_at)}_'
            f'{self.board.group_name}_msg'
        )

    def save(self, *args, **kwargs):
        if not self.message:
            msg = 'Message cannot be blank'
            raise ValidationError(msg, code='BLANK_MESSAGE')
        super().save(*args, **kwargs)