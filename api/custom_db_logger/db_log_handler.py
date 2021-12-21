import logging

db_default_formatter = logging.Formatter()


class DatabaseLogHandler(logging.Handler):
    def emit(self, record):        
        from custom_db_logger.models import StatusLog

        trace = None
        if record.exc_info:
            trace = db_default_formatter.formatException(record.exc_info)

        client_ip = None
        if hasattr(record, 'client_ip'):
            client_ip = record.client_ip

        command = None
        if hasattr(record, 'command'):
            command = record.command

        board = None
        if hasattr(record, 'board'):
            board = record.board

        user = None
        if hasattr(record, 'user'):
            user = record.user

        metadata = None
        if hasattr(record, 'metadata'):
            metadata = record.metadata

        msg = self.format(record)

        kwargs = {
            'asc_time': record.asctime,
            'board': board,
            'client_ip': client_ip,
            'command': command,
            'filename': record.filename,
            'func_name': record.funcName,
            'level': record.levelno,
            'line_no': record.lineno,
            'logger_name': record.name,
            'metadata': metadata,
            'module': record.module,
            'msg': msg,
            'pathname': record.pathname,
            'process': record.process,
            'process_name': record.processName,
            'thread': record.thread,
            'thread_name': record.threadName,
            'trace': trace,
            'user': user,
        }

        StatusLog.objects.create(**kwargs)

    def format(self, record):
        if self.formatter:
            fmt = self.formatter
        else:
            fmt = db_default_formatter

        if type(fmt) == logging.Formatter:
            record.message = record.getMessage()

            if fmt.usesTime():
                record.asctime = fmt.formatTime(record, fmt.datefmt)

            # Ignore exception traceback and stack info
            return fmt.formatMessage(record)
        else:
            return fmt.format(record)