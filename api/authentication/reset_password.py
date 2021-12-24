from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from urllib import parse


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