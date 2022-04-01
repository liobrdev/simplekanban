# Generated by Django 3.2.9 on 2022-04-01 15:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('activity_logs', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='activitylog',
            name='command',
            field=models.CharField(choices=[('read_board', 'Read Board'), ('create_board', 'Create Board'), ('delete_board', 'Delete Board'), ('update_board', 'Update Board'), ('list_boards', 'List Boards'), ('update_board_title', 'Title'), ('create_msg', 'Create Msg'), ('update_msg', 'Update Msg'), ('create_task', 'Create Task'), ('update_task', 'Update Task'), ('move_task', 'Move Task'), ('delete_task', 'Delete Task'), ('create_column', 'Create Column'), ('update_column', 'Update Column'), ('move_column', 'Move Column'), ('delete_column', 'Delete Column'), ('update_member_display_name', 'Display Name'), ('update_member_role', 'Role'), ('join_board', 'Join'), ('remove_member', 'Remove'), ('leave_board', 'Leave'), ('invite_member', 'Invite'), ('no_command', 'No Command'), ('submit_demo', 'Submit Demo')], editable=False, max_length=255, null=True),
        ),
    ]
