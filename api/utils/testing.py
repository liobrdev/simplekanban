import re

from django.contrib.auth import get_user_model
from django.db import connections

from boards.models import Board
from boards.utils import BoardRoles
from columns.models import Column
from custom_db_logger.utils import LogLevels
from tasks.models import Task


test_user_1 = {
    'name': 'Jane Doe',
    'email': 'janedoe@email.com',
    'password': 'pAssw0rd!',
    'has_team_account': True,
}

test_user_2 = {
    'name': 'John Doe',
    'email': 'johndoe@email.com',
    'password': 'pAssw0rd!',
}

test_user_3 = {
    'name': 'Jesse Doe',
    'email': 'jessedoe@email.com',
    'password': 'pAssw0rd!',
}

test_user_4 = {
    'name': 'Jean Doe',
    'email': 'jeandoe@email.com',
    'password': 'pAssw0rd!',
}

test_superuser = {
    'name': 'Super User',
    'email': 'superuser@email.com',
    'password': 'Admin!123',
}


test_demo_board = {
    'board_slug': 'demo',
    'board_title': 'Demo board',
    'columns': [
        {
            'board': 'demo',
            'column_id': 1234567890,
            'column_title': 'To do',
            'column_index': 0,
            'wip_limit_on': True,
            'wip_limit': 5,
            'updated_at': '',
        },
        {
            'board': 'demo',
            'column_id': 1234567891,
            'column_title': 'Doing',
            'column_index': 1,
            'wip_limit_on': True,
            'wip_limit': 3,
            'updated_at': '',
        },
        {
            'board': 'demo',
            'column_id': 1234567892,
            'column_title': 'Done',
            'column_index': 2,
            'wip_limit_on': False,
            'wip_limit': 5,
            'updated_at': '',
        },
    ],
    'tasks': [
        {
            'board': 'demo',
            'column': 1234567890,
            'task_id': 9876543210,
            'task_index': 0,
            'text': 'First task - edit, move, or delete!',
            'updated_at': '',
        }
    ],
    'messages_allowed': False,
    'new_members_allowed': False,
    'activity_logs': [],
    'memberships': [],
    'messages': [],
    'created_at': '',
    'updated_at': '',
}


def create_user(data=test_user_1):
    return get_user_model().objects.create_user(**data)


def create_superuser(data=test_superuser):
    return get_user_model().objects.create_superuser(**data)


def create_board(admin, *users, **kwargs):
    board = Board.objects.create(
        board_title='New kanban board',
        messages_allowed=admin.has_team_account,
        new_members_allowed=admin.has_team_account,)
    column_1 = Column.objects.create(
        board=board,
        column_title='To do',
        column_index=0,)
    column_2 = Column.objects.create(
        board=board,
        column_title='In review',
        column_index=1,)
    column_3 = Column.objects.create(
        board=board,
        column_title='Completed',
        column_index=2,)
    column_4 = Column.objects.create(
        board=board,
        column_title='In production',
        column_index=3,
        wip_limit=1,)
    task_1 = Task.objects.create(
        board=board,
        column=column_1,
        task_index=0,
        text='Build frontend',)
    task_2 = Task.objects.create(
        board=board,
        column=column_1,
        task_index=1,
        text='Contact client',)
    task_3 = Task.objects.create(
        board=board,
        column=column_2,
        task_index=0,
        text='Build API',)
    task_4 = Task.objects.create(
        board=board,
        column=column_3,
        task_index=0,
        text='Renew subscription',)
    task_5 = Task.objects.create(
        board=board,
        column=column_4,
        task_index=0,
        text='Fix header',)
    task_6 = Task.objects.create(
        board=board,
        column=column_4,
        task_index=1,
        text='Fix footer',)

    board.users.add(admin, through_defaults={ 'role': BoardRoles.ADMIN })

    if users:
        for user in users:
            board.users.add(
                user, through_defaults={ 'role': BoardRoles.MEMBER },)
    return board


def force_drop_test_databases():
    test_dbs = [
        {
            'db_alias': 'default',
            'db_name': 'test_simplekanban_default_db',
        },
        {
            'db_alias': 'logger',
            'db_name': 'test_simplekanban_logger_db',
        },
    ]

    for test_db in test_dbs:
        db_alias = test_db['db_alias']
        with connections[db_alias].cursor() as cursor:
            db_name = test_db['db_name']
            cursor.execute(
                f'ALTER DATABASE {db_name} CONNECTION LIMIT 0')
            cursor.execute("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s;
            """, [db_name,])
            cursor.execute(f'DROP DATABASE {db_name}')


def log_msg_regex(msg, log_level=None):
    if log_level:
        level_regex = re.escape(LogLevels(log_level).name)
    else:
        level_regex = r'(NOTSET|DEBUG|INFO|WARNING|ERROR|CRITICAL)'
    return (
        r'^' + level_regex +
        r' [\d]{4}-[\d]{2}-[\d]{2} [\d]{2}:[\d]{2}:[\d]{2},[\d]{3} .* line [\d]{0,6} in [\w-]*: ' +
        re.escape(msg) + r'$')