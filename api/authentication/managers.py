from django.db.models import Manager
from django.utils import timezone

from knox import crypto
from knox.settings import CONSTANTS


class EmailVerificationTokenManager(Manager):
    def create(self, user, expiry):
        token  = crypto.create_token_string()
        digest = crypto.hash_token(token)
        expiry = timezone.now() + expiry

        instance = super(EmailVerificationTokenManager, self).create(
            user=user, digest=digest, expiry=expiry,)

        return instance, token


class PasswordRecoveryTokenManager(Manager):
    def create(self, email, expiry):
        token  = crypto.create_token_string()
        digest = crypto.hash_token(token)
        expiry = timezone.now() + expiry

        instance = super(PasswordRecoveryTokenManager, self).create(
            email=email, token_key=token[:CONSTANTS.TOKEN_KEY_LENGTH],
            digest=digest, expiry=expiry,)

        return instance, token
