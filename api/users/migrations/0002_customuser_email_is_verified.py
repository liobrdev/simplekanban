# Generated by Django 3.2.9 on 2022-02-03 05:41

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='email_is_verified',
            field=models.BooleanField(default=False),
        ),
    ]