from django.core.management.base import BaseCommand

from utils.testing import force_drop_test_databases


class Command(BaseCommand):
    def handle(self, *args, **options):
        try:
            force_drop_test_databases()
        except Exception as e:
            self.stdout.write(
                self.style.ERROR('Error dropping test databases'))
            raise e
        else:
            self.stdout.write(
                self.style.SUCCESS('Successfully dropped test databases'))