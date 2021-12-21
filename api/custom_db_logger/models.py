from django.db.models import (
    CharField, DateTimeField, GenericIPAddressField, JSONField, Model,
    PositiveBigIntegerField, PositiveSmallIntegerField, TextField,)

from custom_db_logger.utils import LogLevels


class StatusLog(Model):
    asc_time = CharField(max_length=255)
    board = CharField(max_length=255, null=True, db_index=True)
    client_ip = GenericIPAddressField(null=True, db_index=True)
    command = CharField(max_length=255, null=True, db_index=True)
    created_at = DateTimeField(auto_now_add=True, editable=False)
    filename = CharField(max_length=255)
    func_name = CharField(max_length=255)
    level = PositiveSmallIntegerField(
        choices=LogLevels.choices, default=LogLevels.ERROR, db_index=True)
    line_no = PositiveSmallIntegerField()
    logger_name = CharField(max_length=255, db_index=True)
    metadata = JSONField(null=True)
    module = CharField(max_length=255)
    msg = TextField()
    pathname = CharField(max_length=500)
    process = PositiveSmallIntegerField()
    process_name = CharField(max_length=255)
    thread = PositiveBigIntegerField()
    thread_name = CharField(max_length=255)
    trace = TextField(blank=True, null=True)
    user = CharField(max_length=255, null=True, db_index=True)

    def __str__(self):
        return self.msg

    class Meta:
        ordering = ('-created_at',)
        verbose_name_plural = verbose_name = 'Logging'