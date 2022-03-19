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

if docker-compose run --rm -T certbot renew > /dev/null
then
  echo "Successful certificate renewal."
fi
