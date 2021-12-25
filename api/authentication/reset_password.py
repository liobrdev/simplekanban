try:
    from hmac import compare_digest
except ImportError:
    def compare_digest(a, b):
        return a == b

import binascii

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from knox.crypto import hash_token
from urllib import parse

from authentication.models import ResetPasswordToken


def send_reset_password_email(email, token_string, device_name, browser_name):
    token = parse.quote(token_string)

    protocol = 'http'
    if not settings.DEBUG:
        protocol += 's'

    link = f'{protocol}://{settings.DOMAIN}/reset_password?token={token}'

    html_message = render_to_string(
        'email_reset_password.html',
        {
            'device_name': device_name,
            'browser_name': browser_name,
            'link_reset_password': link,
        },
    )

    plain_message = strip_tags(html_message)

    send_mail(
        'Reset password for SimpleKanban account',
        plain_message,
        'support@simplekanban.app',
        [email],
        html_message=html_message,
    )


def check_reset_token(email, token_string):
    for reset_token in ResetPasswordToken.objects.filter(email=email):
        if reset_token.expiry < timezone.now():
            reset_token.delete()
            continue
        try:
            digest = hash_token(token_string, reset_token.salt)
        except (TypeError, binascii.Error):
            continue
        if compare_digest(digest, reset_token.digest):
            return reset_token
        continue
    raise