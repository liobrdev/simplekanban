from django.db.models.enums import TextChoices


class AuthCommands(TextChoices):
    LOGIN = 'login'
    LOGOUT = 'logout'
    REGISTER = 'register'
    FORGOT_PW = 'forgot_password'
    RESET_PW = 'reset_password'
    VERIFY_EMAIL = 'verify_email'