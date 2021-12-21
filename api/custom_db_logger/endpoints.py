from django.urls import include, re_path
from rest_framework import routers

from custom_db_logger.api import StatusLogAPI

router = routers.SimpleRouter()
router.register('logs', StatusLogAPI, 'logs')

urlpatterns = [
    re_path('', include(router.urls)),
]