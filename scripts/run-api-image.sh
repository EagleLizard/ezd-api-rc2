#!/usr/bin/env bash

set -e

source .env

scripts_dir=$(realpath "$(dirname $0)")
source $scripts_dir/config.sh

runContainer() {
  pRun docker run -it -d \
    --name $api_container_name \
    -p ${EZD_PORT}:${EZD_PORT} \
    --restart unless-stopped \
    --env-file ./.env \
    -e POSTGRES_HOST=host.docker.internal \
    -e EZD_HOST=0.0.0.0 \
    $api_image_name
}

stopContainer() {
  pRun docker stop $api_container_name
  pRun docker rm $api_container_name
}

runApiImage() {
  local arg1=$1
  local stop=false
  local build=false
  local run=false
  case "$arg1" in
    s|stop)
      stop=true
      ;;
    *) if [ -z "$arg1" ]; then
        run=true
      else
        fatal "Invalid argument: $arg1"
      fi
      ;;
  esac
  if [ "$run" = true ]; then
    echo "running container"
    runContainer
  elif [ $stop ]; then
    echo "stopping container"
    stopContainer
  fi
  return 0
}

runApiImage "$@"
