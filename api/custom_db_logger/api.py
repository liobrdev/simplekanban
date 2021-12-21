from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAdminUser
from rest_framework.viewsets import ReadOnlyModelViewSet

from custom_db_logger.filters import StatusLogFilter
from custom_db_logger.models import StatusLog
from custom_db_logger.serializers import StatusLogSerializer


class StatusLogAPI(ReadOnlyModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = StatusLog.objects.all()
    serializer_class = StatusLogSerializer
    filter_backends = (DjangoFilterBackend, OrderingFilter,)
    filterset_class = StatusLogFilter
    ordering_fields = ('created_at',)
    ordering = '-created_at'