import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache

from datetime import datetime, timedelta
from freezegun import freeze_time

from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from authentication.invalid_login import InvalidLoginCache
from authentication.models import ResetPasswordToken
from authentication.utils import AuthCommands
from custom_db_logger.models import StatusLog
from custom_db_logger.serializers import StatusLogSerializer
from custom_db_logger.utils import LogLevels
from utils.testing import test_user_1, test_user_2, create_user, log_msg_regex


class AuthenticationTest(APITestCase):
    databases = '__all__'

    def tearDown(self):
        InvalidLoginCache.delete(test_user_1['email'])
        InvalidLoginCache.delete(test_user_2['email'])
        cache.delete('throttle_login_127.0.0.1_15_m')
        cache.delete(f"throttle_login_{test_user_1['email']}_15_m")
        cache.delete('throttle_register_127.0.0.1_15_m')
        cache.delete(f"throttle_register_{test_user_1['email']}_15_m")
        cache.delete('throttle_login_127.0.0.1_60_d')
        cache.delete(f"throttle_login_{test_user_1['email']}_60_d")
        cache.delete('throttle_register_127.0.0.1_60_d')
        cache.delete(f"throttle_register_{test_user_1['email']}_60_d")

    def test_register_fail_missing_info(self):
        res_fail = self.client.post(reverse('register'), data={})
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_fail.data['name'], ['This field is required.'])
        self.assertListEqual(res_fail.data['email'], ['This field is required.'])
        self.assertListEqual(res_fail.data['password'], ['This field is required.'])
        self.assertListEqual(res_fail.data['password_2'], ['This field is required.'])
        log = StatusLog.objects.using('logger').latest('created_at')
        self.assertRegex(log.msg, log_msg_regex('Missing register data.', LogLevels.ERROR))
        self.assertEqual(log.command, AuthCommands.REGISTER)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Missing register data.')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)

    def test_register_fail_empty_info(self):
        res_fail = self.client.post(reverse('register'), data={
            'email': '',
            'name': '',
            'password': '',
            'password_2': '',
        })
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_fail.data['name'], ['This field may not be blank.'])
        self.assertListEqual(res_fail.data['email'], ['This field may not be blank.'])
        self.assertListEqual(res_fail.data['password'], ['This field may not be blank.'])
        self.assertListEqual(res_fail.data['password_2'], ['This field may not be blank.'])
        log = StatusLog.objects.using('logger').latest('created_at')
        self.assertRegex(log.msg, log_msg_regex('Missing register data.', LogLevels.ERROR))
        self.assertEqual(log.command, AuthCommands.REGISTER)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Missing register data.')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)

    def test_register_fail_invalid_info(self):
        res_fail = self.client.post(reverse('register'), data={
            'email': 'bademail.com',
            'name': 'Bad name #$',
            'password': test_user_1['password'],
            'password_2': test_user_1['password'],
        })
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_fail.data['name'], ['Please enter a valid name.'])
        self.assertListEqual(res_fail.data['email'], ['Please enter a valid email address.'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)

    def test_register_fail_invalid_password(self):
        res_1 = self.client.post(reverse('register'), data={
            'email': test_user_1['email'],
            'name': test_user_1['name'],
            'password': '898980',
            'password_2': '898980',
        })
        self.assertEqual(res_1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_1.data['non_field_errors'], [
            'This password is too short. It must contain at least 8 characters.',
            'This password is entirely numeric.',
        ])
        res_2 = self.client.post(reverse('register'), data={
            'email': test_user_1['email'],
            'name': test_user_1['name'],
            'password': test_user_1['email'],
            'password_2': test_user_1['email'],
        })
        self.assertEqual(res_2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_2.data['non_field_errors'], [
            'The password is too similar to the email address.',
        ])
        res_3 = self.client.post(reverse('register'), data={
            'email': test_user_1['email'],
            'name': test_user_1['name'],
            'password': 'asdfqwer',
            'password_2': 'asdfqwer',
        })
        self.assertEqual(res_3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_3.data['non_field_errors'], ['This password is too common.'])
        res_4 = self.client.post(reverse('register'), data={
            'email': test_user_1['email'],
            'name': test_user_1['name'],
            'password': test_user_1['password'],
            'password_2': 'asdfqwer',
        })
        self.assertEqual(res_4.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_4.data['non_field_errors'], ['Passwords do not match.'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)

    def test_successful_user_register(self):
        response = self.client.post(reverse('register'), data={
            'email': test_user_1['email'],
            'name': test_user_1['name'],
            'password': test_user_1['password'],
            'password_2': test_user_1['password'],
        })
        user = get_user_model().objects.last()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['user_slug'], user.user_slug)
        self.assertEqual(response.data['user']['email'], user.email)
        self.assertEqual(response.data['user']['name'], user.name)
        self.assertRegex(response.data['token'], r'^[\w-]{64}$')
        self.assertTrue(user.has_beta_account)
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)

    def test_resigter_fail_already_exists(self):
        user = get_user_model().objects.create_user(**test_user_1)
        res_fail = self.client.post(reverse('register'), data={
            'email': user.email,
            'name': user.name,
            'password': user.password,
            'password_2': user.password,
        })
        self.assertEqual(res_fail.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res_fail.data['detail'], 'Cannot create account with this email.')
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)

    def test_login_fail_missing_info(self):
        res_fail = self.client.post(reverse('login'), data={})
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_fail.data['email'], ['This field is required.'])
        self.assertListEqual(res_fail.data['password'], ['This field is required.'])
        log = StatusLog.objects.using('logger').latest('created_at')
        self.assertRegex(log.msg, log_msg_regex('Missing login data.', LogLevels.ERROR))
        self.assertEqual(log.command, AuthCommands.LOGIN)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Missing login data.')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)

    def test_login_fail_empty_info(self):
        res_fail = self.client.post(reverse('login'), data={
            'email': '',
            'password': '',
        })
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_fail.data['email'], ['This field may not be blank.'])
        self.assertListEqual(res_fail.data['password'], ['This field may not be blank.'])
        log = StatusLog.objects.using('logger').latest('created_at')
        self.assertRegex(log.msg, log_msg_regex('Missing login data.', LogLevels.ERROR))
        self.assertEqual(log.command, AuthCommands.LOGIN)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Missing login data.')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)

    def test_login_fail_invalid_info(self):
        res_fail = self.client.post(reverse('login'), data={
            'email': 'bademail.com',
            'password': test_user_1['password'],
        })
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(res_fail.data['email'], ['Please enter a valid email address.'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)

    def test_successful_log_in_and_out(self):
        user = create_user()
        response = self.client.post(reverse('login'), data={
            'email': user.email,
            'password': test_user_1['password'],
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['user_slug'], user.user_slug)
        self.assertEqual(response.data['user']['email'], user.email)
        self.assertEqual(response.data['user']['name'], user.name)
        self.assertRegex(response.data['token'], r'^[\w-]{64}$')
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")
        response = self.client.post(reverse('logout'))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)

    def test_login_fail_user_not_found(self):
        res_fail = self.client.post(reverse('login'), data={
            'email': test_user_2['email'],
            'password': test_user_2['password'],
        })
        self.assertEqual(res_fail.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res_fail.data['detail'], (
            'Failed to log in with the info provided.'
        ))
        self.assertIsNotNone(InvalidLoginCache.get(test_user_2['email']))
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)

    def test_login_fail_lockout(self):
        user = create_user()

        # Test lock after repeated invalid attempts
        for i in range(1, 15):
            # print('\n')
            # print(i)
            res_fail = self.client.post(reverse('login'), data={
                'email': user.email,
                'password': 'wrongPW#2',
            })
            if i < 5:
                self.assertEqual(res_fail.status_code, status.HTTP_401_UNAUTHORIZED)
                self.assertEqual(res_fail.data['detail'], (
                    'Failed to log in with the info provided.'
                ))
            elif i >= 5 and i < 9:
                self.assertEqual(res_fail.status_code, status.HTTP_401_UNAUTHORIZED)
                self.assertEqual(res_fail.data['detail'], (
                    'Failed to log in with the info provided. '
                    'For security purposes, this account will be temporarily '
                    f'locked after {10 - i} more unsuccessful login attempts.'
                ))
            elif i == 9:
                self.assertEqual(res_fail.status_code, status.HTTP_401_UNAUTHORIZED)
                self.assertEqual(res_fail.data['detail'], (
                    'Failed to log in with the info provided. '
                    'For security purposes, this account will be temporarily '
                    f'locked after 1 more unsuccessful login attempt.'
                ))
            elif i == 10:
                self.assertEqual(res_fail.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(res_fail.data['detail'], (
                    'Failed to log in with the info provided. '
                    'You have been temporarily locked out of this account.'
                ))
            elif i > 10:
                self.assertEqual(res_fail.status_code, status.HTTP_403_FORBIDDEN)
                self.assertEqual(res_fail.data['detail'], (
                    'You have been temporarily locked out of this account.'
                ))

        # Test locked even with correct info
        # print('\n')
        # print(15)
        res_success_locked = self.client.post(reverse('login'), data={
            'email': user.email,
            'password': test_user_1['password'],
        })
        self.assertEqual(res_success_locked.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res_success_locked.data['detail'], (
            'You have been temporarily locked out of this account.'
        ))

        # Test throttled request after 15 attempts
        # print('\n')
        # print(16)
        res_throttled = self.client.post(reverse('login'), data={
            'email': user.email,
            'password': test_user_1['password'],
        })
        self.assertEqual(res_throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('Request was throttled.', res_throttled.data['detail'])
        log = StatusLog.objects.using('logger').latest('created_at')
        # print(StatusLogSerializer(log).data)
        self.assertRegex(log.msg, log_msg_regex('Client was throttled.', LogLevels.ERROR))
        self.assertEqual(log.command, AuthCommands.LOGIN)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Client was throttled.')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])

        # Test throttled but no redundant log
        # print('\n')
        # print(16.5)
        res_throttled_2 = self.client.post(reverse('login'), data={
            'email': user.email,
            'password': test_user_1['password'],
        })
        self.assertEqual(res_throttled_2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('Request was throttled.', res_throttled_2.data['detail'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)

        # Test no throttle after 1 minute passes
        now = datetime.now()
        freezer = freeze_time(timedelta(minutes=1))
        freezer.start()
        self.assertAlmostEqual(datetime.now().timestamp(), now.timestamp() + 60, 3)
        # print('\n')
        # print(17)
        res_no_throttle_still_locked = self.client.post(reverse('login'), data={
            'email': user.email,
            'password': test_user_1['password'],
        })
        self.assertEqual(res_no_throttle_still_locked.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res_no_throttle_still_locked.data['detail'], (
            'You have been temporarily locked out of this account.'
        ))
        freezer.stop()

        # Test unlocked after 5 minutes pass
        now = datetime.now()
        freezer = freeze_time(timedelta(minutes=5))
        freezer.start()
        self.assertAlmostEqual(datetime.now().timestamp(), now.timestamp() + 300, 3)
        # print('\n')
        # print(18)
        res_unlocked = self.client.post(reverse('login'), data={
            'email': user.email,
            'password': 'wrongPW#2',
        })
        self.assertEqual(res_unlocked.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res_unlocked.data['detail'], (
            'Failed to log in with the info provided.'
        ))
        # print('\n')
        # print(19)
        response = self.client.post(reverse('login'), data={
            'email': user.email,
            'password': test_user_1['password'],
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['user_slug'], user.user_slug)
        self.assertEqual(response.data['user']['email'], user.email)
        self.assertEqual(response.data['user']['name'], user.name)
        self.assertRegex(response.data['token'], r'^[\w-]{64}$')
        freezer.stop()
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)
    
    def test_reset_password_request(self):
        # Successful request w/ existing user
        user = create_user()
        response_1 = self.client.post(reverse('reset_password_request'), data={
            'email': user.email,
        })
        self.assertEqual(response_1.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ResetPasswordToken.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].subject, 'Reset password for SimpleKanban account')
        self.assertEqual(mail.outbox[0].to, [user.email])
        protocol = 'http'
        if not settings.DEBUG:
            protocol += 's'
        email_substring = f'{protocol}://{settings.DOMAIN}/reset_password?token='
        self.assertIn(email_substring, mail.outbox[0].body)
        reset_password_token_1 = re.search(
            re.escape(email_substring) + r'([\w-]{64})',
            mail.outbox[0].body,
        ).group(1)
        self.assertIsInstance(reset_password_token_1, str)

        # Already requested w/ existing user, no additional email
        response_2 = self.client.post(reverse('reset_password_request'), data={
            'email': user.email,
        })
        self.assertEqual(response_2.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ResetPasswordToken.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)

        # Non-existing user, successful request but no email
        response_3 = self.client.post(reverse('reset_password_request'), data={
            'email': 'notauser@email.com',
        })
        self.assertEqual(response_3.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ResetPasswordToken.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)

        # Test create new token and new email after an hour has passed
        now = datetime.now()
        freezer = freeze_time(timedelta(hours=1))
        freezer.start()
        self.assertAlmostEqual(datetime.now().timestamp(), now.timestamp() + 3600, 3)
        response_4 = self.client.post(reverse('reset_password_request'), data={
            'email': user.email,
        })
        self.assertEqual(response_4.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ResetPasswordToken.objects.count(), 2)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(
            mail.outbox[1].subject, 'Reset password for SimpleKanban account')
        self.assertEqual(mail.outbox[1].to, [user.email])
        self.assertIn(email_substring, mail.outbox[1].body)
        reset_password_token_2 = re.search(
            re.escape(email_substring) + r'([\w-]{64})',
            mail.outbox[1].body,
        ).group(1)
        self.assertIsInstance(reset_password_token_2, str)
        self.assertNotEqual(reset_password_token_1, reset_password_token_2)