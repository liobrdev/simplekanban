from django.conf import settings
from django.db.models import (
    CharField, DateTimeField, EmailField, ForeignKey, PROTECT,)

from knox.settings import CONSTANTS

from authentication.managers import (
    EmailVerificationTokenManager, PasswordRecoveryTokenManager,)
from utils.models import CustomBaseMixin


class EmailVerificationToken(CustomBaseMixin):
    user = ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=PROTECT,
        related_name='email_verification_tokens', editable=False,)
    token_key = CharField(max_length=CONSTANTS.TOKEN_KEY_LENGTH, db_index=True)
    digest    = CharField(max_length=CONSTANTS.DIGEST_LENGTH, primary_key=True)
    expiry    = DateTimeField(null=True, blank=True)

    objects = EmailVerificationTokenManager()

    def __str__(self):
        return '%s : %s' % (self.digest, self.user.email)


class PasswordRecoveryToken(CustomBaseMixin):
    email     = EmailField(blank=False, null=False, editable=False)
    token_key = CharField(max_length=CONSTANTS.TOKEN_KEY_LENGTH, db_index=True)
    digest    = CharField(max_length=CONSTANTS.DIGEST_LENGTH, primary_key=True)
    expiry    = DateTimeField(null=True, blank=True)

    objects = PasswordRecoveryTokenManager()

    def __str__(self):
        return '%s : %s' % (self.digest, self.email)
