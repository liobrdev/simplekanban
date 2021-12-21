from django.db.models.enums import IntegerChoices, TextChoices


class BoardRoles(IntegerChoices):
    ADMIN = 1
    MODERATOR = 2
    MEMBER = 3


class BoardCommands(TextChoices):
    READ_BOARD = 'read_board'
    CREATE_BOARD = 'create_board'
    DELETE_BOARD = 'delete_board'
    UPDATE_BOARD =  'update_board'
    LIST_BOARDS = 'list_boards'
    TITLE = 'update_board_title'
    CREATE_MSG = 'create_msg'
    UPDATE_MSG = 'update_msg'
    CREATE_TASK = 'create_task'
    UPDATE_TASK = 'update_task'
    MOVE_TASK = 'move_task'
    DELETE_TASK = 'delete_task'
    CREATE_COLUMN = 'create_column'
    UPDATE_COLUMN = 'update_column'
    MOVE_COLUMN = 'move_column'
    DELETE_COLUMN = 'delete_column'
    DISPLAY_NAME = 'update_member_display_name'
    ROLE = 'update_member_role'
    JOIN = 'join_board'
    REMOVE = 'remove_member'
    LEAVE = 'leave_board'
    INVITE = 'invite_member'
    NO_COMMAND = 'no_command'