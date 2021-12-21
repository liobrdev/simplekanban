from django.conf import settings
from django.core import mail
from django.core.cache import cache

from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from boards.serializers import BoardSerializer, ListBoardSerializer
from boards.utils import BoardCommands
from custom_db_logger.models import StatusLog
from custom_db_logger.utils import LogLevels
from utils.testing import create_user, create_board, log_msg_regex, test_user_1


class BoardTest(APITestCase):
    databases = '__all__'

    def setUp(self):
        self.user_1 = create_user()

    def tearDown(self):
        cache.delete('throttle_login_127.0.0.1_15_m')
        cache.delete(f"throttle_login_{test_user_1['email']}_15_m")
        cache.delete('throttle_login_127.0.0.1_60_d')
        cache.delete(f"throttle_login_{test_user_1['email']}_60_d")
        cache.delete('throttle_create_board_127.0.0.1_50_m')
        cache.delete(f"throttle_create_board_{test_user_1['email']}_50_m")
        cache.delete('throttle_list_boards_127.0.0.1_120_m')
        cache.delete(f"throttle_list_boards_{test_user_1['email']}_120_m")

    def test_successful_list_boards(self):
        board = create_board(self.user_1)
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        response = self.client.get('/api/boards/', format='json')
        serialized_board = ListBoardSerializer(
            board.memberships.get(user=self.user_1),
        ).data
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(response.data, [serialized_board])
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)

    def test_successful_retrieve_board(self):
        board = create_board(self.user_1)
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        response = self.client.get(f"/api/boards/{board.board_slug}/", format='json')
        serialized_board = BoardSerializer(board).data
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertDictEqual(response.data, serialized_board)
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)

    def test_create_board_fail_missing_data(self):
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        res_fail = self.client.post('/api/boards/', data={}, format='json')
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_fail.data['detail'], 'Error creating board.')
        log = StatusLog.objects.using('logger').latest('created_at')
        self.assertRegex(log.msg, log_msg_regex('Error creating board.', LogLevels.ERROR))
        self.assertEqual(log.command, BoardCommands.CREATE_BOARD)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Error creating board.')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)

    def test_create_board_fail_blank_data(self):
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        res_fail = self.client.post(
            '/api/boards/', data=dict(board_title=''), format='json',)
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_fail.data['detail'], 'Error creating board.')
        log = StatusLog.objects.using('logger').latest('created_at')
        self.assertRegex(log.msg, log_msg_regex('Error creating board.', LogLevels.ERROR))
        self.assertEqual(log.command, BoardCommands.CREATE_BOARD)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Error creating board.')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)

    def test_successful_create_board(self):
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        response = self.client.post(
            '/api/boards/',
            data=dict(board_title='New kanban board 1'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['board']['board_title'], 'New kanban board 1')
        self.assertRegex(response.data['board']['board_slug'], r'^[\w-]{10}$')
        response = self.client.post(
            '/api/boards/',
            data=dict(board_title='New kanban board 2'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['board']['board_title'], 'New kanban board 2')
        self.assertRegex(response.data['board']['board_slug'], r'^[\w-]{10}$')
        self.assertEqual(StatusLog.objects.using('logger').count(), 0)