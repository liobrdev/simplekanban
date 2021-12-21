from django.db.models.enums import TextChoices


class UserCommands(TextChoices):
    DEACTIVATE = 'deactivate_account'
    UPDATE = 'update_user'
    UPGRADE = 'upgrade_account'
    DOWNGRADE = 'downgrade_account'