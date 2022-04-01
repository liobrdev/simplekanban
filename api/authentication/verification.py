try:
    from hmac import compare_digest
except ImportError:
    def compare_digest(a, b):
        return a == b

import binascii

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

from knox.crypto import hash_token
from urllib import parse

from authentication.models import EmailVerificationToken
from authentication.utils import AuthCommands


def send_verification_email(email, name, token_string):
    token = parse.quote(token_string)

    protocol = 'http'
    if not settings.DEBUG:
        protocol += 's'

    link = f'{protocol}://{settings.DOMAIN}/verify_email?token={token}'

    html_message = render_to_string('email_verify_email.html', {
        'name': name,
        'link': link,
    })

    plain_message = strip_tags(html_message)

    send_mail(
        'Verify your email address', plain_message,
        'support@simplekanban.app', [email], html_message=html_message,)


def check_verification_token(command, user, token_string):
    if command == AuthCommands.VERIFY_EMAIL:
        Token = EmailVerificationToken
    else:
        raise ImproperlyConfigured(f"Invalid verification command '{command}'")

    for token in Token.objects.filter(user=user):
        if token.expiry <= timezone.now():
            token.delete()
            continue
        try:
            digest = hash_token(token_string)
        except (TypeError, binascii.Error):
            continue
        if compare_digest(digest, token.digest):
            return token
        continue
    raise