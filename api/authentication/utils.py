from django.db.models.enums import TextChoices


class AuthCommands(TextChoices):
    LOGIN = 'login'
    LOGOUT = 'logout'
    REGISTER = 'register'
    RESET_PW_REQUEST = 'reset_password_request'
    RESET_PW_PROCEED = 'reset_password_proceed'