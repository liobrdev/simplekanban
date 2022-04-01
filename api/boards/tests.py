from django.conf import settings
from django.core import mail
from django_redis import get_redis_connection

from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from boards.models import Board
from boards.serializers import BoardSerializer, ListBoardSerializer
from boards.utils import BoardCommands
from custom_db_logger.models import StatusLog
from custom_db_logger.utils import LogLevels
from utils.testing import (
    create_user, create_board, log_msg_regex, test_user_1, test_demo_board,)


class BoardTest(APITestCase):
    databases = '__all__'

    def setUp(self):
        self.user_1 = create_user()

    def tearDown(self):
        get_redis_connection('default').flushall()

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
        self.assertListEqual(mail.outbox[0].to, ['contact@simplekanban.app'])
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
        self.assertListEqual(mail.outbox[0].to, ['contact@simplekanban.app'])
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

    def test_submit_demo_fail_missing_data(self):
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        res_fail = self.client.post(reverse('submit_demo'), data={}, format='json')
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_fail.data['detail'], 'Error submitting demo.')
        log = StatusLog.objects.using('logger').latest('created_at')
        self.assertRegex(log.msg, log_msg_regex('Error submitting demo.', LogLevels.ERROR))
        self.assertEqual(log.command, BoardCommands.SUBMIT_DEMO)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Error submitting demo.')
        self.assertListEqual(mail.outbox[0].to, ['contact@simplekanban.app'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)

    def test_submit_demo_fail_blank_data(self):
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        res_fail = self.client.post(
            reverse('submit_demo'),
            data=dict(board_title='', columns=[{}], tasks=[{}]), format='json',)
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_fail.data['detail'], 'Error submitting demo.')
        log = StatusLog.objects.using('logger').latest('created_at')
        self.assertRegex(log.msg, log_msg_regex('Error submitting demo.', LogLevels.ERROR))
        self.assertEqual(log.command, BoardCommands.SUBMIT_DEMO)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Error submitting demo.')
        self.assertListEqual(mail.outbox[0].to, ['contact@simplekanban.app'])
        self.assertEqual(StatusLog.objects.using('logger').count(), 1)

    def test_successful_submit_demo(self):
        login = self.client.post(reverse('login'), data={
            'email': test_user_1['email'],
            'password': test_user_1['password'],
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        response = self.client.post(
            reverse('submit_demo'), data=test_demo_board, format='json',)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['board']['board_title'], 'Demo board')
        self.assertRegex(response.data['board']['board_slug'], r'^[\w-]{10}$')

        instance = Board.objects.get(board_slug=response.data['board']['board_slug'])
        self.assertEqual(instance.columns.count(), len(test_demo_board['columns']))
        self.assertEqual(instance.tasks.count(), len(test_demo_board['tasks']))

        column_titles = list(instance.columns.values_list(
            'column_title', flat=True,
        ).order_by('column_title'))
        self.assertListEqual(column_titles, ['Doing', 'Done', 'To do'])

        column_ids = list(instance.columns.values_list(
            'column_id', flat=True,
        ).order_by('column_id'))

        for task in instance.tasks.all():
            self.assertIn(task.text, ['First task - edit, move, or delete!'])
            self.assertIn(task.column.column_id, column_ids)

        self.assertEqual(StatusLog.objects.using('logger').count(), 0)
