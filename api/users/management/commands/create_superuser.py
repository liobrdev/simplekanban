from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from secret_django_settings import (
    DJANGO_SUPERUSER_NAME,
    DJANGO_SUPERUSER_EMAIL,
    DJANGO_SUPERUSER_PASSWORD,
)


class Command(BaseCommand):
    def handle(self, *args, **options):
        try:
            get_user_model().objects.create_superuser(
                DJANGO_SUPERUSER_NAME,
                DJANGO_SUPERUSER_EMAIL,
                DJANGO_SUPERUSER_PASSWORD,
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR('Error creating superuser'))
            raise e
        else:
            self.stdout.write(
                self.style.SUCCESS('Successfully created superuser'))