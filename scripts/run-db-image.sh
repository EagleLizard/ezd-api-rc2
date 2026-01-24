#!/usr/bin/env bash

set -e

scripts_dir=$(realpath "$(dirname $0)")
parent_dir=$(realpath "$(dirname $0)/..")
source $parent_dir/.env
source $scripts_dir/config.sh

echo ${POSTGRES_PORT}

runContainer() {
  pRun docker run -it -d \
    --name $db_container_name \
    -p ${POSTGRES_PORT}:${POSTGRES_DOCKER_PORT} \
    --restart unless-stopped \
    -v ./ezd_api_pg_db_data:/var/lib/postgresql/data \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
    -e POSTGRES_USER=${POSTGRES_USER} \
    -e POSTGRES_DB=${POSTGRES_DB} \
    $db_image_name
}
stopContainer() {
  pRun docker stop $db_container_name
  pRun docker rm $db_container_name
}
buildImage() {
  local commit=$(git rev-parse HEAD | head -c 8)
  local timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
  local timestamp_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
}

main() {
  local arg1=$1
  case "$arg1" in
    s|stop)
      stopContainer
      ;;
    *) if [ -z "$arg1" ]; then
        runContainer
      else
        fatal "Invalid argument: $arg1"
      fi
      ;;
  esac
}

main "$@"

