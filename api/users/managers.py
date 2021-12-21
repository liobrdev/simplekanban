from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.hashers import make_password
from django.utils.translation import gettext_lazy as _


class CustomUserManager(BaseUserManager):
    def get_by_natural_key(self, email):
        return self.get(email=email, is_active=True)

    def create_user(self, name, email, password, **kwargs):
        if not name:
            raise ValueError(_('You must use a valid name!'))
        if not email:
            raise ValueError(_('You must use a valid email address!'))
        email = self.normalize_email(email)
        user = self.model(name=name, email=email, **kwargs)
        user.password = make_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, name, email, password):
        extra = dict(is_staff=True, is_superuser=True, has_team_account=True)
        return self.create_user(name, email, password, **extra)

    def delete(self, user=None, **kwargs):
        if user:
            user.delete()
        else:
            self.model(**kwargs).delete()