#!/usr/bin/env bash

set -e # fail fast

source $(realpath "$(dirname $0)")/config.sh

# PROJ_DIRNAME=ezd-api-rc2
# db_image_name=ezd-api-rc2-postgres

main() {
  local commit=$(git rev-parse HEAD | head -c 8)
  local timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
  local timestamp_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  # echo $commit
  # echo $timestamp
  # local tags=("latest" "$commit" "$timestamp" "$timestamp_iso")
  local tags=("$timestamp.$commit" "latest")
  local tagStr=""
  for i in ${tags[@]}; do
    # echo $i
    tagStr="$tagStr $db_image_name:$i"
  done
  echo ${tags[@]}
  echo ${tagStr}
  local parentDir=$(realpath "$(dirname $0)/..");
  if [ $(basename $parentDir) != $PROJ_DIRNAME ]; then
    fatal "wrong directory";
  fi
  echo "${parentDir}/Dockerfile.pg"
  docker build --pull --no-cache \
    -t "${db_image_name}:${commit}" \
    -f "${parentDir}/Dockerfile.pg" .
  for image_tag in ${tags[@]}; do
    docker image tag ${db_image_name}:${commit} ${db_image_name}:${image_tag}
  done
}

main


