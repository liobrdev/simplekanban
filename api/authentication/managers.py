from django.db.models import Manager
from django.utils import timezone

from knox import crypto


class EmailVerificationTokenManager(Manager):
    def create(self, user, expiry):
        token  = crypto.create_token_string()
        salt   = crypto.create_salt_string()
        digest = crypto.hash_token(token, salt)
        expiry = timezone.now() + expiry

        instance = super(EmailVerificationTokenManager, self).create(
            user=user,
            salt=salt,
            digest=digest,
            expiry=expiry,
        )

        return instance, token