from rest_framework.serializers import ModelSerializer

from custom_db_logger.models import StatusLog


class StatusLogSerializer(ModelSerializer):
    class Meta:
        model = StatusLog
        fields = '__all__'