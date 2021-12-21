from itertools import chain

from django_filters import rest_framework as filters

from custom_db_logger.models import StatusLog
from custom_db_logger.utils import LogLevels
from utils import COMMANDS


class StatusLogFilter(filters.FilterSet):
    command = filters.ChoiceFilter(choices=COMMANDS, null_label='None')
    created_at = filters.DateTimeFromToRangeFilter()
    level = filters.MultipleChoiceFilter(choices=LogLevels.choices)

    class Meta:
        model = StatusLog
        fields = [
            'board', 'client_ip', 'command', 'created_at',
            'level', 'logger_name', 'user',]