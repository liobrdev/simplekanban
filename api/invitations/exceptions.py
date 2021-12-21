from django.db import IntegrityError


class InvitedAlreadyMember(IntegrityError):
    def __init__(self, email):
        self.email = email

    def __str__(self):
        return f'<{self.email}> is already a member of this project.'