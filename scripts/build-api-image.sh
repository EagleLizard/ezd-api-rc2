#!/usr/bin/env bash

set -e # fail fast

scripts_dir=$(realpath "$(dirname $0)")

source $scripts_dir/config.sh

main() {
  local commit=$(git rev-parse HEAD | head -c 8)
  local timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
  local timestamp_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local tags=("$timestamp.$commit" "latest")
  local parentDir=$(realpath "$(dirname $0)/..");
  if [ $(basename $parentDir) != $PROJ_DIRNAME ]; then
    fatal "wrong directory";
  fi
  pRun docker build --pull --no-cache \
    -t "${api_image_name}:${commit}" \
    -f "${parentDir}/Dockerfile" .
  for image_tag in ${tags[@]}; do
    pRun docker image tag ${api_image_name}:${commit} ${api_image_name}:${image_tag}
  done
}

main
