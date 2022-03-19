#!/bin/bash

set -o pipefail -e

HOME=/home/ubuntu
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

if ! docker info > /dev/null 2>&1
then
  systemctl restart docker
fi

PROJECT_NAME=$1
PROJECT_DIR=$HOME/$1
cd $PROJECT_DIR

DB_SERVICE=$2
if ! docker-compose ps $DB_SERVICE | \
  grep "docker-entrypoint.sh postgres[[:space:]]*Up" > /dev/null 2>&1
then
  docker-compose restart $DB_SERVICE
fi

DB_NAME=`cat $PROJECT_DIR/secrets/${DB_SERVICE}_name.txt`
DB_USER=`cat $PROJECT_DIR/secrets/${DB_SERVICE}_user.txt`

CONTAINER_BACKUPS_DIR="/var/lib/postgresql/data/backups"
HOST_BACKUPS_DIR="$PROJECT_DIR/$DB_SERVICE$CONTAINER_BACKUPS_DIR"

if [ ! -d "$HOST_BACKUPS_DIR" ]
then
  mkdir $HOST_BACKUPS_DIR
fi

docker-compose exec -T $DB_SERVICE bash -c \
  "pg_dump --inserts --column-inserts --username=$DB_USER $DB_NAME > \
    $CONTAINER_BACKUPS_DIR/$DB_NAME-$(TZ=EST date +%F-%Hh%Mm%Ss%Z).sql"

LATEST_BACKUP=`ls $HOST_BACKUPS_DIR -At | head -n 1`

if aws s3 mv $HOST_BACKUPS_DIR/$LATEST_BACKUP \
  s3://$PROJECT_NAME/$DB_SERVICE/backups/ > /dev/null
then
  echo "Successful backup."
fi
