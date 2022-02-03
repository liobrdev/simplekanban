import logging

from django.conf import settings
from django.core import mail
from django_redis import get_redis_connection

from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from custom_db_logger.models import StatusLog
from custom_db_logger.serializers import StatusLogSerializer
from custom_db_logger.utils import LogLevels
from users.utils import UserCommands
from utils.testing import (
    create_user, create_superuser, log_msg_regex,
    test_user_1, test_superuser,)


class DatabaseLoggerTest(APITestCase):
    databases = '__all__'

    def setUp(self):
        self.user_1 = create_user()
        self.superuser = create_superuser()
        self.logger = logging.getLogger('db_logger')

    def tearDown(self):
        get_redis_connection('default').flushall()

    def test_exception(self):
        exc_message = 'Exception Message!'
        try:
            raise Exception(exc_message)
        except Exception as e:
            self.logger.exception(e)
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)
        instance = StatusLog.objects.using('logger').latest('created_at')
        log = StatusLogSerializer(instance).data
        self.assertRegex(log['msg'], log_msg_regex(exc_message, LogLevels.ERROR))
        self.assertEqual(log['level'], LogLevels.ERROR)
        self.assertIsNotNone(log['trace'])

    def test_fail_list_logs_not_permitted(self):
        self._fail_register_missing_info()
        self._fail_update_user()
        self.assertEqual(StatusLog.objects.using('logger').count(), 2)
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        response = self.client.get('/api/logs/', format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data['detail'],
            'You do not have permission to perform this action.',
        )
        self.assertEqual(StatusLog.objects.using('logger').count(), 2)

    def test_successful_list_logs(self):
        self._fail_register_missing_info()
        self._fail_update_user()
        self.assertEqual(StatusLog.objects.using('logger').count(), 2)
        logs = StatusLog.objects.using('logger').all()
        serialized_logs = StatusLogSerializer(logs, many=True).data
        login = self.client.post(reverse('login'), data={
            'email': test_superuser['email'],
            'password': test_superuser['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        response = self.client.get('/api/logs/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(response.data, serialized_logs)

    def test_get_status_log_fail_update_user(self):
        auth, path = self._fail_update_user()
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)
        instance = StatusLog.objects.using('logger').latest('created_at')
        log = StatusLogSerializer(instance).data
        login = self.client.post(reverse('login'), data={
            'email': test_superuser['email'],
            'password': test_superuser['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        response = self.client.get(f"/api/logs/{instance.id}/", format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertDictEqual(response.data, log)
        self.assertRegex(log['msg'], log_msg_regex('Error updating user.', LogLevels.ERROR))
        self.assertEqual(log['level'], LogLevels.ERROR)
        self.assertEqual(log['client_ip'], '127.0.0.1')
        self.assertEqual(log['command'], UserCommands.UPDATE)
        self.assertIsNotNone(log['trace'])
        self.assertDictEqual(log['metadata']['request_data'], dict(name='New'))
        self.assertEqual(log['metadata']['REMOTE_ADDR'], '127.0.0.1')
        self.assertEqual(log['metadata']['REQUEST_METHOD'], 'PATCH')
        self.assertEqual(log['metadata']['HTTP_AUTHORIZATION'], auth)
        self.assertEqual(log['metadata']['PATH_INFO'], path)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Error updating user.')
        self.assertListEqual(mail.outbox[0].to, ['contact@simplekanban.app'])

    def _fail_register_missing_info(self):
        res_fail = self.client.post(reverse('register'), data={})
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_fail.data['name'], ['This field is required.'])
        self.assertListEqual(res_fail.data['email'], ['This field is required.'])
        self.assertListEqual(res_fail.data['password'], ['This field is required.'])
        self.assertListEqual(res_fail.data['password_2'], ['This field is required.'])

    def _fail_update_user(self):
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        auth = f"Token {login.data['token']}"
        self.client.credentials(HTTP_AUTHORIZATION=auth)
        user_slug = login.data['user']['user_slug']
        url = f'/api/users/{user_slug}/'
        patch = self.client.patch(url, data={ 'name': 'New' }, format='json')
        self.assertEqual(patch.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(patch.data['detail'], 'Error updating account.')
        return (auth, url)