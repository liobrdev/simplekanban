from django.db.models import CharField, DateTimeField, EmailField, Manager
from django.utils import timezone

from knox import crypto
from knox.settings import CONSTANTS

from utils.models import CustomBaseMixin


class PasswordRecoveryTokenManager(Manager):
    def create(self, email, expiry):
        token  = crypto.create_token_string()
        salt   = crypto.create_salt_string()
        digest = crypto.hash_token(token, salt)
        expiry = timezone.now() + expiry

        instance = super(PasswordRecoveryTokenManager, self).create(
            email=email,
            token_key=token[:CONSTANTS.TOKEN_KEY_LENGTH],
            salt=salt,
            digest=digest,
            expiry=expiry,
        )

        return instance, token


class PasswordRecoveryToken(CustomBaseMixin):
    email     = EmailField(blank=False, null=False, editable=False)
    token_key = CharField(max_length=CONSTANTS.TOKEN_KEY_LENGTH, db_index=True)
    salt      = CharField(max_length=CONSTANTS.SALT_LENGTH, unique=True)
    digest    = CharField(max_length=CONSTANTS.DIGEST_LENGTH, primary_key=True)
    expiry    = DateTimeField(null=True, blank=True)

    objects = PasswordRecoveryTokenManager()

    def __str__(self):
        return '%s : %s' % (self.digest, self.email)