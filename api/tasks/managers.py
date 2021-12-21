from django.db import transaction
from django.db.models import F, Manager
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _

from columns.models import Column


class TaskManager(Manager):
    def delete(self, instance):
        '''Delete a task and reposition other tasks if necessary.'''
        greater_tasks = self.get_queryset().select_for_update().filter(
            board=instance.board,
            column=instance.column,
            task_index__gt=instance.task_index,)

        with transaction.atomic():
            if greater_tasks:
                greater_tasks.update(
                    task_index=F('task_index') - 1,
                    updated_at=now(),)

            with transaction.atomic():
                return instance.delete()

    def move(self, instance, new_column_id, new_index):
        new_column_id = int(new_column_id)
        new_index = int(new_index)

        if new_column_id == instance.column:
            '''
            Move a task to a new index on the column and
            reposition other tasks if necessary.
            '''
            tasks = self.get_queryset().select_for_update().filter(
                board=instance.board,
                column=instance.column,)

            with transaction.atomic():
                destination_task_count = tasks.count()
                if new_index >= destination_task_count:
                    new_index = destination_task_count - 1
                elif new_index < 0:
                    new_index = 0

                with transaction.atomic():
                    if new_index < instance.task_index:
                        tasks.filter(
                            task_index__lt=instance.task_index,
                            task_index__gte=new_index,
                        ).exclude(
                            task_id=instance.task_id,
                        ).update(
                            task_index=F('task_index') + 1,
                            updated_at=now(),
                        )
                    elif new_index > instance.task_index:
                        tasks.filter(
                            task_index__lte=new_index,
                            task_index__gt=instance.task_index,
                        ).exclude(
                            task_id=instance.task_id,
                        ).update(
                            task_index=F('task_index') - 1,
                            updated_at=now(),
                        )

                instance.task_index = new_index
                instance.save(update_fields=['task_index', 'updated_at'])
                return instance
        else:
            '''
            Move a task to a new index on a new column and
            reposition sister tasks on old column and new column.
            '''
            source_greater_tasks = self.get_queryset().select_for_update().filter(
                board=instance.board,
                column=instance.column,
                task_index__gt=instance.task_index,
            ).exclude(task_id=instance.task_id)

            destination_tasks = self.get_queryset().select_for_update().filter(
                board=instance.board,
                column=new_column_id,)

            destination_task_count = destination_tasks.count()

            destination_greater_tasks = destination_tasks.filter(
                task_index__gte=new_index,)

            with transaction.atomic():
                if source_greater_tasks:
                    with transaction.atomic():
                        source_greater_tasks.update(
                            task_index=F('task_index') - 1,
                            updated_at=now(),)

                if destination_greater_tasks:
                    with transaction.atomic():
                        destination_greater_tasks.update(
                            task_index=F('task_index') + 1,
                            updated_at=now(),)

                if new_index > destination_task_count:
                    new_index = destination_task_count
                elif new_index < 0:
                    new_index = 0

                instance.column = Column.objects.get(column_id=new_column_id)
                instance.task_index = new_index
                instance.save(update_fields=['column', 'task_index', 'updated_at'])
                return instance
