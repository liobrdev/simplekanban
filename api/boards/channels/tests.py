import re

from pprint import pprint
from urllib import parse

from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.test import TransactionTestCase, override_settings
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from authentication.invalid_login import InvalidLoginCache
from boards.channels import actions
from boards.channels.utils import ChannelCodes
from boards.models import Board, BoardMembership
from boards.serializers import BoardSerializer, BoardMembershipSerializer
from boards.utils import BoardCommands, BoardRoles
from custom_db_logger.models import StatusLog
from custom_db_logger.serializers import StatusLogSerializer
from custom_db_logger.utils import LogLevels
from simplekanban_api.websocket_router import application
from users.serializers import ReadOnlyUserSerializer
from utils import COMMAND_VALUES
from utils.testing import (
    create_board, create_user, log_msg_regex,
    test_user_1, test_user_2, test_user_3, test_user_4,)
from utils.throttling import THROTTLE_RATES


TEST_CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}


class TestWebsockets(TransactionTestCase):
    databases = '__all__'

    def tearDown(self):
        InvalidLoginCache.delete(test_user_1['email'])
        InvalidLoginCache.delete(test_user_2['email'])
        InvalidLoginCache.delete(test_user_3['email'])
        InvalidLoginCache.delete(test_user_4['email'])

        for command in COMMAND_VALUES + ['invalid_command']:
            try:
                throttle_rates = THROTTLE_RATES[command]
            except KeyError:
                try:
                    throttle_rates = THROTTLE_RATES['default']
                except KeyError:
                    throttle_rates = ['120/m']

            for rate in throttle_rates:
                rate_string = rate.replace('/', '_')
                cache.delete(f'throttle_{command}_127.0.0.1_{rate_string}')
                cache.delete(f'throttle_{command}_123.255.245.33_{rate_string}')
                cache.delete(f"throttle_{command}_{test_user_1['email']}_{rate_string}")
                cache.delete(f"throttle_{command}_{test_user_2['email']}_{rate_string}")
                cache.delete(f"throttle_{command}_{test_user_3['email']}_{rate_string}")
                cache.delete(f"throttle_{command}_{test_user_4['email']}_{rate_string}")


    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_fail_invalid_commands(self):
        user = await database_sync_to_async(create_user)()
        board = await database_sync_to_async(create_board)(user)
        communicator = await self._auth_connect(user, board.board_slug)
        await communicator.receive_json_from()

        # Test fail misspelled 'command'
        await communicator.send_json_to({ 'comandd': BoardCommands.CREATE_MSG })
        response_1 = await communicator.receive_json_from()
        self.assertEqual(response_1['code'], ChannelCodes.ERROR)
        self.assertEqual(response_1['error']['message'], 'Missing command')
        self.assertEqual(response_1['error']['command'], BoardCommands.NO_COMMAND)
        log_1 = await self._get_status_log(latest=True)
        self.assertRegex(log_1['msg'], log_msg_regex('Missing command', LogLevels.ERROR))
        self.assertEqual(log_1['command'], BoardCommands.NO_COMMAND)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Missing command')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 1)

        # Test fail missing command throttled
        await communicator.send_json_to({})
        response_2 = await communicator.receive_json_from()
        self.assertEqual(response_2['code'], ChannelCodes.ERROR)
        self.assertEqual(response_2['error']['message'], 'Too many requests')
        self.assertEqual(response_2['error']['command'], BoardCommands.NO_COMMAND)
        self.assertIn('Request was throttled.', response_2['error']['detail'])
        log_2 = await self._get_status_log(latest=True)
        self.assertRegex(log_2['msg'], log_msg_regex('Client was throttled.', LogLevels.ERROR))
        self.assertEqual(log_2['command'], BoardCommands.NO_COMMAND)
        self.assertEqual(log_2['board'], board.board_slug)
        self.assertEqual(log_2['user'], user.user_slug)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[1].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Client was throttled.')
        self.assertListEqual(mail.outbox[1].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 2)

        # Test fail missing command throttled but no log
        await communicator.send_json_to({})
        response_3 = await communicator.receive_json_from()
        self.assertEqual(response_3['code'], ChannelCodes.ERROR)
        self.assertEqual(response_3['error']['message'], 'Too many requests')
        self.assertEqual(response_3['error']['command'], BoardCommands.NO_COMMAND)
        self.assertIn('Request was throttled.', response_3['error']['detail'])
        self.assertEqual(await self._get_status_log_count(), 2)

        # Test fail unrecognized command
        await communicator.send_json_to({ 'command': 'not_recognized' })
        response_4 = await communicator.receive_json_from()
        self.assertEqual(response_4['code'], ChannelCodes.ERROR)
        self.assertEqual(response_4['error']['message'], 'Invalid command')
        self.assertEqual(response_4['error']['command'], 'not_recognized')
        log_3 = await self._get_status_log(latest=True)
        self.assertRegex(log_3['msg'], log_msg_regex('Invalid command', LogLevels.ERROR))
        self.assertEqual(log_3['command'], 'not_recognized')
        self.assertEqual(len(mail.outbox), 3)
        self.assertEqual(mail.outbox[2].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Invalid command')
        self.assertListEqual(mail.outbox[2].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 3)

        # Test fail unrecoginized command throttled
        await communicator.send_json_to({ 'command': 'unrecognized' })
        response_5 = await communicator.receive_json_from()
        self.assertEqual(response_5['code'], ChannelCodes.ERROR)
        self.assertEqual(response_5['error']['message'], 'Too many requests')
        self.assertEqual(response_5['error']['command'], 'unrecognized')
        self.assertIn('Request was throttled.', response_5['error']['detail'])
        log_4 = await self._get_status_log(latest=True)
        self.assertRegex(log_4['msg'], log_msg_regex('Client was throttled.', LogLevels.ERROR))
        self.assertEqual(log_4['command'], 'invalid_command')
        self.assertEqual(log_4['metadata']['invalid_command'], 'unrecognized')
        self.assertEqual(log_4['board'], board.board_slug)
        self.assertEqual(log_4['user'], user.user_slug)
        self.assertEqual(len(mail.outbox), 4)
        self.assertEqual(mail.outbox[3].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Client was throttled.')
        self.assertListEqual(mail.outbox[3].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 4)

        # Test fail unrecognized throttle again but no log
        await communicator.send_json_to({ 'command': 'what_is_this' })
        response_6 = await communicator.receive_json_from()
        self.assertEqual(response_6['code'], ChannelCodes.ERROR)
        self.assertEqual(response_6['error']['message'], 'Too many requests')
        self.assertEqual(response_6['error']['command'], 'what_is_this')
        self.assertIn('Request was throttled.', response_6['error']['detail'])
        self.assertEqual(await self._get_status_log_count(), 4)
        await communicator.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_authorized_user_can_join_board_room(self):
        user = await database_sync_to_async(create_user)()
        board = await database_sync_to_async(create_board)(user)
        communicator = await self._auth_connect(user, board.board_slug)
        response = await communicator.receive_json_from()
        data = await database_sync_to_async(actions._read_board)(board, user)
        message = dict(code=ChannelCodes.BOARD_LOADED, data=data)
        self.assertDictEqual(response, message)
        await communicator.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_create_msg(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)

        # Test fail create log w/ blank message
        await communicator_1.send_json_to({
            'command': BoardCommands.CREATE_MSG,
            'board_msg': '',
        })
        res_blank = await communicator_1.receive_json_from()
        self.assertEqual(res_blank['code'], ChannelCodes.ERROR)
        self.assertEqual(res_blank['error']['message'], 'Invalid content')
        self.assertEqual(res_blank['error']['command'], BoardCommands.CREATE_MSG)
        log_1 = await self._get_status_log(latest=True)
        self.assertRegex(log_1['msg'], log_msg_regex('Invalid content', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Invalid content')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 1)

        # Test fail create log w/ missing message
        await communicator_1.send_json_to({ 'command': BoardCommands.CREATE_MSG })
        res_missing = await communicator_1.receive_json_from()
        self.assertEqual(res_missing['code'], ChannelCodes.ERROR)
        self.assertEqual(res_missing['error']['message'], 'Invalid content')
        self.assertEqual(res_missing['error']['command'], BoardCommands.CREATE_MSG)
        log_2 = await self._get_status_log(latest=True)
        self.assertRegex(log_2['msg'], log_msg_regex('Invalid content', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[1].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Invalid content')
        self.assertListEqual(mail.outbox[1].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 2)

        # Test fail create log w/ non-string message
        await communicator_1.send_json_to({
            'command': BoardCommands.CREATE_MSG,
            'board_msg': 1234,
        })
        res_nonstring = await communicator_1.receive_json_from()
        self.assertEqual(res_nonstring['code'], ChannelCodes.ERROR)
        self.assertEqual(res_nonstring['error']['message'], 'Invalid content')
        self.assertEqual(res_nonstring['error']['command'], BoardCommands.CREATE_MSG)
        log_3 = await self._get_status_log(latest=True)
        self.assertRegex(log_3['msg'], log_msg_regex('Invalid content', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 3)
        self.assertEqual(mail.outbox[2].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Invalid content')
        self.assertListEqual(mail.outbox[2].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 3)

        # Test successful create log
        await communicator_1.send_json_to({
            'command': BoardCommands.CREATE_MSG,
            'board_msg': 'Test message',
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.MSG_CREATED)
        self.assertEqual(response_1['data']['board'], board.board_slug)
        self.assertEqual(response_1['data']['message'], 'Test message')
        self.assertDictEqual(response_1['data']['sender'], ReadOnlyUserSerializer(user_1).data)
        self.assertEqual(response_1['user'], user_1.user_slug)
        self.assertEqual(await self._get_status_log_count(), 3)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_admin_can_update_board_title(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)

        # Test fail update board title w/ blank 'board_title'
        await communicator_1.send_json_to({
            'command': BoardCommands.TITLE,
            'board_title': '',
        })
        res_blank = await communicator_1.receive_json_from()
        self.assertEqual(res_blank['code'], ChannelCodes.ERROR)
        self.assertEqual(res_blank['error']['message'], 'Invalid content')
        self.assertEqual(res_blank['error']['command'], BoardCommands.TITLE)
        log_1 = await self._get_status_log(latest=True)
        self.assertRegex(log_1['msg'], log_msg_regex('Invalid content', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Invalid content')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 1)

        # Test fail update board title w/ missing 'board_title'
        await communicator_1.send_json_to({ 'command': BoardCommands.TITLE })
        res_missing = await communicator_1.receive_json_from()
        self.assertEqual(res_missing['code'], ChannelCodes.ERROR)
        self.assertEqual(res_missing['error']['message'], 'Invalid content')
        self.assertEqual(res_missing['error']['command'], BoardCommands.TITLE)
        log_2 = await self._get_status_log(latest=True)
        self.assertRegex(log_2['msg'], log_msg_regex('Invalid content', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[1].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Invalid content')
        self.assertListEqual(mail.outbox[1].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 2)

        # Test fail update board title by non-admin
        await communicator_2.send_json_to({
            'command': BoardCommands.TITLE,
            'board_title': 'New board title',
        })
        res_fail_2 = await communicator_2.receive_json_from()
        self.assertEqual(res_fail_2['code'], ChannelCodes.ERROR)
        self.assertEqual(res_fail_2['error']['message'], 'Action not allowed')
        self.assertEqual(res_fail_2['error']['command'], BoardCommands.TITLE)
        log_3 = await self._get_status_log(latest=True)
        self.assertRegex(log_3['msg'], log_msg_regex('Action not allowed', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 3)
        self.assertEqual(mail.outbox[2].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Action not allowed')
        self.assertListEqual(mail.outbox[2].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 3)

        # Test successful board title update
        await communicator_1.send_json_to({
            'command': BoardCommands.TITLE,
            'board_title': 'New board title',
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.BOARD_UPDATED)
        self.assertEqual(response_1['data']['board_title'], 'New board title')
        self.assertEqual(response_1['user'], user_1.user_slug)
        self.assertEqual(await self._get_status_log_count(), 3)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_create_task(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        board_tasks = welcome_1['data']['tasks']
        column_id = welcome_1['data']['columns'][0]['column_id']
        column_tasks = list(filter(
            lambda t: t['column'] == column_id,
            welcome_1['data']['tasks'],
        ))
        self.assertDictEqual(welcome_1, welcome_2)
        await communicator_1.send_json_to({
            'command': BoardCommands.CREATE_TASK,
            'text': 'Newest task',
            'column_id': column_id,
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.TASKS_SAVED)
        self.assertEqual(len(response_1['data']), len(board_tasks) + 1)
        new_task = next((
            task for task in response_1['data'] if (
                task['text'] == 'Newest task' and task['column'] == column_id
            )
        ), None)
        self.assertIsInstance(new_task, dict)
        self.assertEqual(new_task['task_index'], len(column_tasks))
        self.assertEqual(response_1['user'], user_1.user_slug)
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_move_task(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        task_to_move = next((
            task for task in welcome_1['data']['tasks'] if (
                task['text'] == 'Build frontend'
            )
        ), None)
        self.assertIsInstance(task_to_move, dict)
        destination_column = welcome_1['data']['columns'][3]

        await communicator_2.send_json_to({
            'command': BoardCommands.MOVE_TASK,
            'task_id': task_to_move['task_id'],
            'column_id': destination_column['column_id'],
            'task_index': 1,
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.TASKS_SAVED)
        moved_task = next((
            task for task in response_1['data'] if (
                task['task_id'] == task_to_move['task_id']
            )
        ), None)
        self.assertIsInstance(moved_task, dict)
        self.assertEqual(moved_task['column'], destination_column['column_id'])
        self.assertEqual(moved_task['task_index'], 1)
        self.assertEqual(response_1['user'], user_2.user_slug)

        serialized_board = await self._get_board(board.board_slug, user_2)
        old_sister_tasks = [
            t for t in serialized_board['tasks'] if (
                t['column'] == task_to_move['column']
            )
        ]
        new_sister_tasks = [
            t for t in serialized_board['tasks'] if (
                t['column'] == destination_column['column_id']
            )
        ]

        self.assertEqual(old_sister_tasks[0]['text'], 'Contact client')
        self.assertEqual(old_sister_tasks[0]['task_index'], 0)
        self.assertEqual(new_sister_tasks[0]['text'], 'Fix header')
        self.assertEqual(new_sister_tasks[0]['task_index'], 0)
        self.assertEqual(new_sister_tasks[1]['text'], 'Build frontend')
        self.assertEqual(new_sister_tasks[1]['task_index'], 1)
        self.assertEqual(new_sister_tasks[2]['text'], 'Fix footer')
        self.assertEqual(new_sister_tasks[2]['task_index'], 2)
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_update_task(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        task_id = welcome_1['data']['tasks'][0]['task_id']
        await communicator_2.send_json_to({
            'command': BoardCommands.UPDATE_TASK,
            'task_id': task_id,
            'text': 'Task updated',
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.TASKS_SAVED)
        updated_task = next((
            task for task in response_1['data'] if task['task_id'] == task_id
        ), None)
        self.assertIsInstance(updated_task, dict)
        self.assertEqual(updated_task['text'], 'Task updated')
        self.assertEqual(response_1['user'], user_2.user_slug)
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_delete_task(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)

        column = [
            c for c in welcome_1['data']['columns'] if (
                c['column_title'] == 'To do'
            )
        ][0]
        tasks = [
            t for t in welcome_1['data']['tasks'] if (
                t['column'] == column['column_id']
            )
        ]

        task_to_delete = tasks[0]
        task_to_remain = tasks[1]
        self.assertEqual(task_to_delete['task_index'], 0)
        self.assertEqual(task_to_remain['task_index'], 1)

        await communicator_1.send_json_to({
            'command': BoardCommands.DELETE_TASK,
            'task_id': task_to_delete['task_id'],
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.TASKS_SAVED)
        deleted_task = next((
            task for task in response_1['data'] if (
                task['task_id'] == task_to_delete['task_id']
            )
        ), None)
        self.assertIsNone(deleted_task)
        self.assertEqual(response_1['user'], user_1.user_slug)
        serialized_board = await self._get_board(board.board_slug, user_1)
        self.assertListEqual(serialized_board['tasks'], response_1['data'])
        remaining_column_tasks = [
            t for t in serialized_board['tasks'] if (
                t['column'] == column['column_id']
            )
        ]
        self.assertEqual(len(remaining_column_tasks), 1)
        self.assertEqual(remaining_column_tasks[0]['task_index'], 0)
        self.assertEqual(remaining_column_tasks[0]['text'], 'Contact client')
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_create_column(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        columns = welcome_1['data']['columns']
        await communicator_1.send_json_to({
            'command': BoardCommands.CREATE_COLUMN,
            'column_title': 'New column',
            'wip_limit_on': True,
            'wip_limit': 10,
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        new_column_index = len(response_1['data']) - 1
        self.assertEqual(response_1['code'], ChannelCodes.COLUMNS_SAVED)
        self.assertEqual(len(response_1['data']), len(columns) + 1)
        self.assertEqual(response_1['data'][new_column_index]['column_index'], len(columns))
        self.assertEqual(response_1['data'][new_column_index]['column_title'], 'New column')
        self.assertTrue(response_1['data'][new_column_index]['wip_limit_on'])
        self.assertEqual(response_1['data'][new_column_index]['wip_limit'], 10)
        self.assertEqual(response_1['user'], user_1.user_slug)
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_update_column(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        column_id = welcome_1['data']['columns'][0]['column_id']

        # Test update title
        await communicator_1.send_json_to({
            'command': BoardCommands.UPDATE_COLUMN,
            'column_id': column_id,
            'column_title': 'New updated column',
        })
        response_1a = await communicator_1.receive_json_from()
        response_2a = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1a, response_2a)
        self.assertEqual(response_1a['code'], ChannelCodes.COLUMNS_SAVED)
        self.assertEqual(response_1a['data'][0]['column_title'], 'New updated column')
        self.assertTrue(response_1a['data'][0]['wip_limit_on'])
        self.assertEqual(response_1a['data'][0]['wip_limit'], 5)
        self.assertEqual(response_1a['user'], user_1.user_slug)
        self.assertEqual(await self._get_status_log_count(), 0)

        # Test update WIP settings
        await communicator_1.send_json_to({
            'command': BoardCommands.UPDATE_COLUMN,
            'column_id': column_id,
            'wip_limit_on': True,
            'wip_limit': 2,
        })
        response_1b = await communicator_1.receive_json_from()
        response_2b = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1b, response_2b)
        self.assertEqual(response_1b['code'], ChannelCodes.COLUMNS_SAVED)
        self.assertEqual(response_1b['data'][0]['column_title'], 'New updated column')
        self.assertTrue(response_1b['data'][0]['wip_limit_on'])
        self.assertEqual(response_1b['data'][0]['wip_limit'], 2)
        self.assertEqual(response_1b['user'], user_1.user_slug)
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_move_column(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        column_1 = welcome_1['data']['columns'][0]
        column_2 = welcome_1['data']['columns'][1]
        column_3 = welcome_1['data']['columns'][2]
        column_4 = welcome_1['data']['columns'][3]
        self.assertEqual(column_1['column_index'], 0)
        self.assertEqual(column_2['column_index'], 1)
        self.assertEqual(column_3['column_index'], 2)
        self.assertEqual(column_4['column_index'], 3)
        columns = welcome_1['data']['columns']
        await communicator_1.send_json_to({
            'command': BoardCommands.MOVE_COLUMN,
            'column_id': column_1['column_id'],
            'column_index': 2,
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.COLUMNS_SAVED)
        column_1a = response_1['data'][0]
        column_2a = response_1['data'][1]
        column_3a = response_1['data'][2]
        column_4a = response_1['data'][3]
        self.assertEqual(column_1a['column_id'], column_2['column_id'])
        self.assertEqual(column_1a['column_index'], 0)
        self.assertEqual(column_2a['column_id'], column_3['column_id'])
        self.assertEqual(column_2a['column_index'], 1)
        self.assertEqual(column_3a['column_id'], column_1['column_id'])
        self.assertEqual(column_3a['column_index'], 2)
        self.assertEqual(column_4a['column_id'], column_4['column_id'])
        self.assertEqual(column_4a['column_index'], 3)
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_delete_column(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        column_id = welcome_1['data']['columns'][0]['column_id']
        await communicator_1.send_json_to({
            'command': 'delete_column',
            'column_id': column_id,
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.COLUMNS_SAVED)
        self.assertNotIn(column_id, map(lambda c: c['column_id'], response_1['data']))
        self.assertEqual(response_1['data'][0]['column_title'], 'In review')
        self.assertEqual(response_1['data'][0]['column_index'], 0)
        self.assertEqual(response_1['data'][1]['column_title'], 'Completed')
        self.assertEqual(response_1['data'][1]['column_index'], 1)
        self.assertEqual(response_1['data'][2]['column_title'], 'In production')
        self.assertEqual(response_1['data'][2]['column_index'], 2)
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_admin_can_update_member_role(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)

        # Test fail update own role
        await communicator_1.send_json_to({
            'command': BoardCommands.ROLE,
            'user_slug': user_1.user_slug,
            'role': BoardRoles.MODERATOR,
        })
        res_fail_1 = await communicator_1.receive_json_from()
        self.assertEqual(res_fail_1['code'], ChannelCodes.ERROR)
        self.assertEqual(res_fail_1['error']['message'], 'Cannot update own role')
        log_1 = await self._get_status_log(latest=True)
        self.assertRegex(log_1['msg'], log_msg_regex('Cannot update own role', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Cannot update own role')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 1)

        # Test fail update role to admin
        await communicator_1.send_json_to({
            'command': BoardCommands.ROLE,
            'user_slug': user_2.user_slug,
            'role': BoardRoles.ADMIN,
        })
        res_fail_2 = await communicator_1.receive_json_from()
        self.assertEqual(res_fail_2['code'], ChannelCodes.ERROR)
        self.assertEqual(res_fail_2['error']['message'], 'Invalid content')
        log_2 = await self._get_status_log(latest=True)
        self.assertRegex(log_2['msg'], log_msg_regex('Invalid content', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[1].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Invalid content')
        self.assertListEqual(mail.outbox[1].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 2)

        # Test successful update member role
        await communicator_1.send_json_to({
            'command': BoardCommands.ROLE,
            'user_slug': user_2.user_slug,
            'role': BoardRoles.MODERATOR,
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.MEMBERS_SAVED)
        self.assertEqual(response_1['user'], user_1.user_slug)
        updated_member = next((
            member for member in response_1['data']['members'] if (
                member['user']['user_slug'] == user_2.user_slug
            )
        ), None)
        self.assertIsInstance(updated_member, dict)
        self.assertEqual(updated_member['role'], BoardRoles.MODERATOR)
        self.assertListEqual(response_1['data']['updated_slugs'], [user_2.user_slug])
        self.assertEqual(await self._get_status_log_count(), 2)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_update_member_display_name(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)

        # Test successful update display_name
        await communicator_1.send_json_to({
            'command': BoardCommands.DISPLAY_NAME,
            'display_name': 'NewDisplayName',
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.MEMBERS_SAVED)
        self.assertEqual(response_1['user'], user_1.user_slug)
        updated_member = next((
            member for member in response_1['data'] if (
                member['user']['user_slug'] == user_1.user_slug
            )
        ), None)
        self.assertIsInstance(updated_member, dict)
        self.assertEqual(updated_member['display_name'], 'NewDisplayName')
        self.assertEqual(await self._get_status_log_count(), 0)

        # Test fail update display_name already in use
        await communicator_2.send_json_to({
            'command': BoardCommands.DISPLAY_NAME,
            'display_name': 'NewDisplayName',
        })
        res_fail_2 = await communicator_2.receive_json_from()
        self.assertEqual(res_fail_2['code'], ChannelCodes.ERROR)
        self.assertEqual(res_fail_2['error']['command'], BoardCommands.DISPLAY_NAME)
        self.assertEqual(res_fail_2['error']['message'], 'This name is already in use')
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_leave_board(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        user_3 = await database_sync_to_async(create_user)(test_user_3)
        board = await database_sync_to_async(create_board)(user_1, user_2, user_3)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        communicator_3 = await self._auth_connect(user_3, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        welcome_3 = await communicator_3.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        self.assertDictEqual(welcome_1, welcome_3)

        await communicator_1.send_json_to({
            'command': BoardCommands.ROLE,
            'user_slug': user_2.user_slug,
            'role': BoardRoles.MODERATOR,
        })
        update_1 = await communicator_1.receive_json_from()
        update_2 = await communicator_2.receive_json_from()
        update_3 = await communicator_3.receive_json_from()
        self.assertDictEqual(update_1, update_2)
        self.assertDictEqual(update_1, update_3)
        self.assertEqual(update_1['code'], ChannelCodes.MEMBERS_SAVED)
        self.assertEqual(update_1['user'], user_1.user_slug)
        updated_member = next((
            member for member in update_1['data']['members'] if (
                member['user']['user_slug'] == user_2.user_slug
            )
        ), None)
        self.assertIsInstance(updated_member, dict)
        self.assertEqual(updated_member['role'], BoardRoles.MODERATOR)
        self.assertListEqual(update_1['data']['updated_slugs'], [user_2.user_slug])

        # Test fail leave by admin
        await communicator_1.send_json_to({ 'command': BoardCommands.LEAVE })
        response_1a = await communicator_1.receive_json_from()
        self.assertEqual(response_1a['code'], ChannelCodes.ERROR)
        self.assertEqual(response_1a['error']['message'], 'Action not allowed')
        self.assertEqual(response_1a['error']['command'], BoardCommands.LEAVE)
        log_1 = await self._get_status_log(latest=True)
        self.assertRegex(log_1['msg'], log_msg_regex('Action not allowed', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Action not allowed')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 1)

        # Test successful leave by non-admin
        await communicator_2.send_json_to({ 'command': BoardCommands.LEAVE })
        response_1b = await communicator_1.receive_json_from()
        response_2b = await communicator_2.receive_json_from()
        response_3b = await communicator_3.receive_json_from()
        self.assertDictEqual(response_1b, response_2b)
        self.assertDictEqual(response_1b, response_3b)
        self.assertEqual(response_1b['code'], ChannelCodes.MEMBERS_SAVED)
        self.assertEqual(response_1b['user'], user_2.user_slug)
        leaving_member = next((
            member for member in response_1b['data'] if (
                member['user']['user_slug'] == user_2.user_slug
            )
        ), None)
        self.assertIsNone(leaving_member)
        serialized_board = await self._get_board(board.board_slug, user_1)
        self.assertListEqual(serialized_board['memberships'], response_1b['data'])
        self.assertEqual(await self._get_status_log_count(), 1)
        await communicator_1.disconnect()
        await communicator_2.disconnect()
        await communicator_3.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_admin_can_remove_member_from_board(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        communicator_2 = await self._auth_connect(user_2, board.board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)

        # Test remove by non-permitted user
        await communicator_2.send_json_to({
            'command': BoardCommands.REMOVE,
            'user_slug': user_1.user_slug,
        })
        res_fail = await communicator_2.receive_json_from()
        self.assertEqual(res_fail['code'], ChannelCodes.ERROR)
        self.assertEqual(res_fail['error']['message'], 'Action not allowed')
        log_1 = await self._get_status_log(latest=True)
        self.assertRegex(log_1['msg'], log_msg_regex('Action not allowed', LogLevels.ERROR))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Action not allowed')
        self.assertListEqual(mail.outbox[0].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 1)

        # Test successful remove by admin
        await communicator_1.send_json_to({
            'command': BoardCommands.REMOVE,
            'user_slug': user_2.user_slug,
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.MEMBERS_SAVED)
        self.assertEqual(response_1['user'], user_1.user_slug)
        removed_member = next((
            member for member in response_1['data'] if (
                member['user']['user_slug'] == user_2.user_slug
            )
        ), None)
        self.assertIsNone(removed_member)
        serialized_board = await self._get_board(board.board_slug, user_1)
        self.assertListEqual(serialized_board['memberships'], response_1['data'])
        self.assertEqual(await self._get_status_log_count(), 1)
        await communicator_1.disconnect()
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_admin_can_delete_board(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        board_slug = board.board_slug
        communicator_1 = await self._auth_connect(user_1, board_slug)
        communicator_2 = await self._auth_connect(user_2, board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        await communicator_1.send_json_to({
            'command': BoardCommands.DELETE_BOARD,
        })
        response_1 = await communicator_1.receive_json_from()
        response_2 = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1, response_2)
        self.assertEqual(response_1['code'], ChannelCodes.BOARD_DELETED)
        self.assertEqual(response_1['data'], 'Project deleted')
        self.assertFalse(await self._check_board_exists(board_slug))
        await communicator_1.disconnect()
        await communicator_2.disconnect()
        communicator_1a = await self._auth_connect(user_1, board_slug)
        connect_fail = await communicator_1a.receive_json_from()
        self.assertEqual(connect_fail['code'], ChannelCodes.BOARD_FAILED)
        self.assertEqual(connect_fail['error']['message'], 'Failed to load board')
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_1a.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_group_is_alerted_on_user_account_update(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        user_3 = await database_sync_to_async(create_user)(test_user_3)
        board = await database_sync_to_async(create_board)(user_1, user_2, user_3)
        board_slug = board.board_slug
        communicator_1 = await self._auth_connect(user_1, board_slug)
        communicator_2 = await self._auth_connect(user_2, board_slug)
        communicator_3 = await self._auth_connect(user_3, board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        welcome_3 = await communicator_3.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        self.assertDictEqual(welcome_1, welcome_3)
        await communicator_1.disconnect()
        update_1 = await self._update_test_user(user_1)
        self.assertTrue(update_1)
        response_2 = await communicator_2.receive_json_from()
        response_3 = await communicator_3.receive_json_from()
        self.assertDictEqual(response_2, response_3)
        self.assertEqual(response_2['code'], ChannelCodes.MEMBERS_SAVED)
        self.assertEqual(response_2['user'], user_1.user_slug)
        updated_member = next((
            member for member in response_2['data'] if (
                member['user']['user_slug'] == user_1.user_slug
            )
        ), None)
        self.assertIsInstance(updated_member, dict)
        self.assertEqual(updated_member['user']['name'], 'Name update success')
        self.assertEqual(updated_member['user']['email'], 'success@update.com')
        serialized_board = await self._get_board(board.board_slug, user_1)
        self.assertListEqual(serialized_board['memberships'], response_2['data'])
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_2.disconnect()
        await communicator_3.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_group_is_alerted_on_user_account_deactivation(self):
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        user_3 = await database_sync_to_async(create_user)(test_user_3)
        user_4 = await database_sync_to_async(create_user)(test_user_4)
        board = await database_sync_to_async(create_board)(user_1, user_2, user_3, user_4)
        board_slug = board.board_slug
        communicator_1 = await self._auth_connect(user_1, board_slug)
        communicator_2 = await self._auth_connect(user_2, board_slug)
        communicator_3 = await self._auth_connect(user_3, board_slug)
        communicator_4 = await self._auth_connect(user_4, board_slug)
        welcome_1 = await communicator_1.receive_json_from()
        welcome_2 = await communicator_2.receive_json_from()
        welcome_3 = await communicator_3.receive_json_from()
        welcome_4 = await communicator_4.receive_json_from()
        self.assertDictEqual(welcome_1, welcome_2)
        self.assertDictEqual(welcome_1, welcome_3)
        self.assertDictEqual(welcome_1, welcome_4)

        # Test response when non-admins deactivate
        await communicator_4.disconnect()
        self.assertTrue(await self._deactivate_test_user(user_4))
        response_1a = await communicator_1.receive_json_from()
        response_2a = await communicator_2.receive_json_from()
        response_3a = await communicator_3.receive_json_from()
        self.assertDictEqual(response_1a, response_2a)
        self.assertDictEqual(response_1a, response_3a)
        self.assertEqual(response_1a['code'], ChannelCodes.MEMBERS_SAVED)
        deactivated_member_4 = next((
            member for member in response_1a['data'] if (
                member['user']['user_slug'] == user_4.user_slug
            )
        ), None)
        self.assertIsNone(deactivated_member_4)
        serialized_board = await self._get_board(board.board_slug, user_1)
        self.assertListEqual(serialized_board['memberships'], response_1a['data'])

        await communicator_3.disconnect()
        self.assertTrue(await self._deactivate_test_user(user_3))
        response_1b = await communicator_1.receive_json_from()
        response_2b = await communicator_2.receive_json_from()
        self.assertDictEqual(response_1b, response_2b)
        self.assertEqual(response_1b['code'], ChannelCodes.MEMBERS_SAVED)
        deactivated_member_3 = next((
            member for member in response_1b['data'] if (
                member['user']['user_slug'] == user_3.user_slug
            )
        ), None)
        self.assertIsNone(deactivated_member_3)
        serialized_board = await self._get_board(board.board_slug, user_1)
        self.assertListEqual(serialized_board['memberships'], response_1b['data'])

        # Test board deleted when admin deactivates
        await communicator_1.disconnect()
        self.assertTrue(await self._deactivate_test_user(user_1))
        response_2c = await communicator_2.receive_json_from()
        self.assertEqual(response_2c['code'], ChannelCodes.BOARD_DELETED)
        self.assertEqual(response_2c['data'], 'Project deleted')
        self.assertFalse(await self._check_board_exists(board_slug))
        self.assertEqual(await self._get_status_log_count(), 0)
        await communicator_2.disconnect()

    @override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
    async def test_user_can_invite_members_to_board(self):
        settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS
        user_1 = await database_sync_to_async(create_user)()
        user_2 = await database_sync_to_async(create_user)(test_user_2)
        board = await database_sync_to_async(create_board)(user_1, user_2)
        communicator_1 = await self._auth_connect(user_1, board.board_slug)
        await communicator_1.receive_json_from()

        # Invite new user
        await communicator_1.send_json_to({
            'command': BoardCommands.INVITE,
            'invite_email': test_user_3['email'],
        })
        res_invite = await communicator_1.receive_json_from()
        self.assertEqual(res_invite['code'], ChannelCodes.INVITE_SENT)
        self.assertEqual(res_invite['message'], (
            f"Invitation sent to {test_user_3['email']}"
        ))

        # Invite already member
        await communicator_1.send_json_to({
            'command': BoardCommands.INVITE,
            'invite_email': user_2.email,
        })
        res_2 = await communicator_1.receive_json_from()
        self.assertEqual(res_2['code'], ChannelCodes.ERROR)
        self.assertEqual(res_2['error']['command'], BoardCommands.INVITE)
        self.assertEqual(res_2['error']['message'], (
            'User with this email is already a member of this project.'
        ))
        self.assertEqual(await self._get_status_log_count(), 0)

        # Invite already invited
        await communicator_1.send_json_to({
            'command': BoardCommands.INVITE,
            'invite_email': test_user_3['email'],
        })
        res_repeat = await communicator_1.receive_json_from()
        self.assertEqual(res_repeat['code'], ChannelCodes.ERROR)
        self.assertEqual(res_repeat['error']['command'], BoardCommands.INVITE)
        self.assertEqual(res_repeat['error']['message'], (
            'Invitation has already been sent to this email.'
        ))
        self.assertEqual(await self._get_status_log_count(), 0)

        # Invite fail
        await communicator_1.send_json_to({
            'command': BoardCommands.INVITE,
            'invite_email': '',
        })
        res_blank = await communicator_1.receive_json_from()
        self.assertEqual(res_blank['code'], ChannelCodes.ERROR)
        self.assertEqual(res_blank['error']['message'], 'Invalid content')
        self.assertEqual(res_blank['error']['command'], BoardCommands.INVITE)
        log_1 = await self._get_status_log(latest=True)
        self.assertRegex(log_1['msg'], log_msg_regex('Invalid content', LogLevels.ERROR))
        self.assertEqual(mail.outbox[1].subject,
            f'{settings.EMAIL_SUBJECT_PREFIX}ERROR: Invalid content')
        self.assertListEqual(mail.outbox[1].to, ['lio@simplekanban.app'])
        self.assertEqual(await self._get_status_log_count(), 1)

        # Invited user accept invitation
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[0].subject, (
            f'{user_1.name} has invited you to '
            f'collaborate with SimpleKanban!'
        ))
        self.assertEqual(mail.outbox[0].to, [test_user_3['email']])
        protocol = 'http'
        if not settings.DEBUG:
            protocol += 's'
        email_substring = (
            f'{protocol}://{settings.DOMAIN}/invitation'
            f'?board={board.board_slug}&amp;token='
        )
        self.assertIn(email_substring, mail.outbox[0].body)
        self.assertIn(
            '&amp;email=' + parse.quote(test_user_3['email']),
            mail.outbox[0].body,
        )
        invite_token = re.search(
            re.escape(email_substring) + r'([\w-]{64})',
            mail.outbox[0].body,
        ).group(1)
        user_3 = await database_sync_to_async(create_user)(test_user_3)
        communicator_3 = await self._auth_connect(
            user_3, board.board_slug, invite_token,)
        res_load_3 = await communicator_3.receive_json_from()
        self.assertEqual(res_load_3['code'], ChannelCodes.BOARD_LOADED)
        serialized_memberships = res_load_3['data']['memberships']
        res_join_add_1 = await communicator_1.receive_json_from()
        res_join_add_3 = await communicator_3.receive_json_from()
        self.assertDictEqual(res_join_add_1, res_join_add_3)
        self.assertEqual(res_join_add_1['code'], ChannelCodes.MEMBERS_SAVED)
        self.assertListEqual(res_join_add_1['data'], serialized_memberships)
        self.assertEqual(res_join_add_1['user'], user_3.user_slug)
        self.assertEqual(await self._get_status_log_count(), 1)
        await communicator_1.disconnect()
        await communicator_3.disconnect()

    async def _auth_connect(self, user, board_slug, invite_token=None):
        # Log in test user and connect with auth token
        login_res = await self._login_test_user(user)

        try:
            token = login_res.data['token']
        except KeyError as e:
            print('\n')
            print(e)
            pprint(login_res.data)
            raise e

        path = (
            f'/ws/board/{board_slug}/'
            f"?auth_token={token}&client_ip=123.255.245.33"
        )

        if invite_token:
            path += f'&invite_token={invite_token}'

        communicator = WebsocketCommunicator(
            application=application,
            path=path,
        )

        connected, _ = await communicator.connect()
        assert connected is True
        return communicator

    @database_sync_to_async
    def _login_test_user(self, user):
        client = APIClient()
        response = client.post(reverse('login'), data={
            'email': user.email,
            'password': 'pAssw0rd!',
        })
        return response

    @database_sync_to_async
    def _deactivate_test_user(self, user):
        client = APIClient()
        login = client.post(reverse('login'), data={
            'email': user.email,
            'password': 'pAssw0rd!',
        })
        client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        url = f'/api/users/{user.user_slug}/'
        delete = client.delete(
            url,
            data={
                'current_password': 'pAssw0rd!',
                'email': user.email,
            },
            format='json',
        )
        return delete.status_code == status.HTTP_204_NO_CONTENT

    @database_sync_to_async
    def _update_test_user(self, user):
        client = APIClient()
        login = client.post(reverse('login'), data={
            'email': user.email,
            'password': 'pAssw0rd!',
        })
        client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        url = f'/api/users/{user.user_slug}/'
        patch = client.patch(
            url,
            data={
                'name': 'Name update success',
                'email': 'success@update.com',
                'current_password': 'pAssw0rd!',
            },
            format='json',
        )
        return patch.status_code == status.HTTP_200_OK

    @database_sync_to_async
    def _get_membership(self, board, user):
        instance = BoardMembership.objects.get(board=board, user=user)
        context = dict(request=dict(board=board, user=user))
        return BoardMembershipSerializer(instance, context=context).data

    @database_sync_to_async
    def _get_board(self, board_slug, user):
        instance = Board.objects.get(board_slug=board_slug)
        context = dict(request=dict(board=instance, user=user))
        return BoardSerializer(instance, context=context).data

    @database_sync_to_async
    def _check_board_exists(self, board_slug):
        return Board.objects.filter(board_slug=board_slug).exists()

    @database_sync_to_async
    def _get_status_log(self, latest=False, **data):
        if latest:
            instance = StatusLog.objects.using('logger').latest('created_at')
        else:
            instance = StatusLog.objects.using('logger').get(**data)
        return StatusLogSerializer(instance).data

    @database_sync_to_async
    def _get_status_log_count(self):
        return StatusLog.objects.using('logger').count()