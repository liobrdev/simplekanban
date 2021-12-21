from decouple import config


variables = [
    'DB_DEFAULT_NAME',
    'DB_DEFAULT_USER',
    'DB_DEFAULT_PASSWORD',
    'DB_DEFAULT_HOST',
    'DB_DEFAULT_PORT',
    'DB_LOGGER_NAME',
    'DB_LOGGER_USER',
    'DB_LOGGER_PASSWORD',
    'DB_LOGGER_HOST',
    'DB_LOGGER_PORT',
    'DJANGO_SUPERUSER_NAME',
    'DJANGO_SUPERUSER_EMAIL',
    'DJANGO_SUPERUSER_PASSWORD',
    'EMAIL_HOST_USER',
    'EMAIL_HOST_PASSWORD',
    'REDIS_PASSWORD',
    'SECRET_KEY',
]

for variable in variables:
    # Variable should correspond to an environment variable,
    # and the environment variable should be equal to an absolute path
    # of a secret file. For example:
    #
    # >>> print(config('SECRET_KEY'))
    # /path/to/secrets/django_secret_key

    # Open and read the file at this path, then define a variable
    # equal to the content of the first line of the file. For example:
    #
    # >>> globals()['SECRET_KEY'] = '12345secretkey67890!'
    # >>> print(SECRET_KEY)
    # 12345secretkey67890!

    with open(config(variable), 'r') as f:
        data = f.readline().rstrip()
    globals()[variable] = data


# This module should now export variables equal to the
# first line of their respective secret file, for convenient use
# in the Django settings file and other locations. This is to avoid
# saving sensitive data as environment variables, opting instead for
# this data to be read from a secret file whose location is referenced
# by an environment variable. For example:
#
# >>> from decouple import config
# >>> print(config('SECRET_KEY'))
# /path/to/secrets/django_secret_key
# >>> import secret_django_settings as secrets
# >>> print(secrets.SECRET_KEY)
# 12345secretkey67890!

__all__ = variables