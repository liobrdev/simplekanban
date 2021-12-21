from django.utils.translation import gettext_lazy as _

from rest_framework.exceptions import APIException


class RequestError(APIException):
    status_code = 400
    default_detail = _('Something went wrong. Please try again.')
    default_code = 'request_error'