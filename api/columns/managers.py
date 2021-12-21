from django.db import transaction
from django.db.models import F, Manager
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _


class ColumnManager(Manager):
    def delete(self, instance):
        '''Delete a column and reposition other columns if necessary.'''
        greater_columns = self.get_queryset().select_for_update().filter(
            board=instance.board,
            column_index__gt=instance.column_index,)
        with transaction.atomic():
            if greater_columns:
                greater_columns.update(
                    column_index=F('column_index') - 1,
                    updated_at=now(),
                )
            with transaction.atomic():
                return instance.delete()

    def move(self, instance, new_index):
        '''
        Move a column to a new index on the board and
        reposition other columns if necessary.
        '''
        new_index = int(new_index)
        columns = self.get_queryset().select_for_update().filter(
            board=instance.board,)

        with transaction.atomic():
            column_count = columns.count()
            if new_index >= column_count:
                new_index = column_count - 1
            elif new_index < 0:
                new_index = 0

            with transaction.atomic():
                if new_index < instance.column_index:
                    columns.filter(
                        column_index__lt=instance.column_index,
                        column_index__gte=new_index,
                    ).exclude(
                        column_id=instance.column_id,
                    ).update(
                        column_index=F('column_index') + 1,
                        updated_at=now(),
                    )
                elif new_index > instance.column_index:
                    columns.filter(
                        column_index__lte=new_index,
                        column_index__gt=instance.column_index,
                    ).exclude(
                        column_id=instance.column_id,
                    ).update(
                        column_index=F('column_index') - 1,
                        updated_at=now(),
                    )

            instance.column_index = new_index
            instance.save(update_fields=['column_index', 'updated_at'])
            return instance
