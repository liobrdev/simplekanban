from django.db.models.enums import TextChoices


class AuthCommands(TextChoices):
    LOGIN = 'login'
    LOGOUT = 'logout'
    REGISTER = 'register'