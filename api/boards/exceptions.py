from django.db import IntegrityError


class BoardIsFull(IntegrityError):
    def __init__(self, maximum):
        self.max = maximum

    def __str__(self):
        return 'Numbers of members on this project cannot exceed {self.max}.'


class BoardMaximumReached(IntegrityError):
    def __init__(self, maximum):
        self.max = maximum

    def __str__(self):
        return 'Numbers of boards for this account cannot exceed {self.max}.'


class NewMembersNotAllowed(IntegrityError):
    def __str__(self):
        return 'Cannot add members to this project.'