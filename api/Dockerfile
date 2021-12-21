FROM python:3.9-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Activate Python virtualenv
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install dependencies
WORKDIR /api
RUN pip install --upgrade pip
COPY . .
RUN pip install -r requirements.txt

EXPOSE 8000