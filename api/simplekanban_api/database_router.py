class DatabaseRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'custom_db_logger':
            return 'logger'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'custom_db_logger':
            return 'logger'
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Make sure custom_db_logger only appears in the 'logger' database
        if app_label == 'custom_db_logger':
            return db == 'logger'
        else:
            return db == 'default'
        return None