# Generated by Django 3.2.9 on 2022-02-03 05:37

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('authentication', '0002_rename_resetpasswordtoken_passwordrecoverytoken'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailVerificationToken',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('token_key', models.CharField(db_index=True, max_length=8)),
                ('salt', models.CharField(max_length=16, unique=True)),
                ('digest', models.CharField(max_length=128, primary_key=True, serialize=False)),
                ('expiry', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(editable=False, on_delete=django.db.models.deletion.PROTECT, related_name='email_verification_tokens', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]