from django.conf.urls import re_path, include

from authentication import endpoints as auth
from boards import endpoints as boards
from users import endpoints as users
from custom_db_logger import endpoints as logs

urlpatterns = [
    re_path(r'^api/', include(auth)),
    re_path(r'^api/', include(boards)),
    re_path(r'^api/', include(users)),
    re_path(r'^api/', include(logs)),
]