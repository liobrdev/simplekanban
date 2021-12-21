from random import choices
from string import ascii_letters, digits

from django.db.models import Model, DateTimeField


def generate_slug():
    chars = ascii_letters + digits + '-_'
    return ''.join(choices(chars, k=10))


class CustomBaseMixin(Model):
    created_at = DateTimeField(auto_now_add=True, editable=False)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class DummyUser():
    def __init__(self, email, name):
        self.email = email
        self.name = name