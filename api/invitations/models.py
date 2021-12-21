from django.db.models import (
    Model, CharField, DateTimeField, EmailField,
    ForeignKey, Manager, UniqueConstraint, CASCADE,
)
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from knox import crypto
from knox.settings import CONSTANTS

from boards.models import Board
from utils.models import CustomBaseMixin


class EmptyInvitation:
    board = None
    email = None
    tokens = []

    @property
    def is_empty(self):
        return True


class EmptyToken:
    user = None
    invitation = None
    digest = None
    token_key = None
    salt = None
    created = None
    expiry = None

    @property
    def is_empty(self):
        return True


class Invitation(CustomBaseMixin):
    board = ForeignKey(
        Board,
        on_delete=CASCADE,
        related_name='invitations',
        editable=False,)
    email = EmailField(
        _('email invited'),
        blank=False,
        null=False,
        editable=False,)

    class Meta:
        constraints = [
            # No duplicate invitations
            UniqueConstraint(fields=['board', 'email'], name='unique_invite'),
        ]

    def __str__(self):
        return self.email

    @property
    def is_empty(self):
        return False


class InviteTokenManager(Manager):
    def create(self, invitation, expiry):
        token = crypto.create_token_string()
        salt = crypto.create_salt_string()
        digest = crypto.hash_token(token, salt)
        expiry = timezone.now() + expiry

        instance = super(InviteTokenManager, self).create(
            token_key=token[:CONSTANTS.TOKEN_KEY_LENGTH], digest=digest,
            salt=salt, invitation=invitation, expiry=expiry)
        return instance, token


class InviteToken(Model):
    invitation = ForeignKey(
        Invitation,
        null=False,
        blank=False,
        related_name='tokens',
        on_delete=CASCADE,
    )
    digest = CharField(
        max_length=CONSTANTS.DIGEST_LENGTH, primary_key=True)
    token_key = CharField(
        max_length=CONSTANTS.TOKEN_KEY_LENGTH, db_index=True)
    salt = CharField(
        max_length=CONSTANTS.SALT_LENGTH, unique=True)
    created = DateTimeField(auto_now_add=True)
    expiry = DateTimeField(null=True, blank=True)

    objects = InviteTokenManager()

    def __str__(self):
        return '%s : %s' % (self.digest, self.invitation.email)

    @property
    def is_empty(self):
        return False