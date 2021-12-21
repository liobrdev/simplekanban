from django.db import IntegrityError


class DuplicateEmail(IntegrityError):
    def __init__(self, email):
        self.email = email

    def __str__(self):
        return f'Duplicate email: {self.email}'


class DuplicateSuperUser(IntegrityError):
    def __init__(self, user_slug, name, email):
        self.user_slug = user_slug
        self.name = name
        self.email = email

    def __str__(self):
        return f'Attempted duplicate superuser: {self.name} <{self.user_slug}:{self.email}>'