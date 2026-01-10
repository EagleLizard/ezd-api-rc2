#!/usr/bin/env bash

# echo $BASH
# echo $BASH_VERSION

PROJ_DIRNAME=ezd-api-rc2

fatal() {
	echo '[FATAL]' "$@" >&2
	exit 1
}
head() {
  echo "";
  echo $(printf "!%0.s" {1..10});
}
pRun() {
  echo "_> $@"
  eval $@
}

main() {
  head;
  local skipUserContinuePrompt=false
  while getopts "y" opt; do
    case "$opt" in
      y) skipUserContinuePrompt=true ;;
      ?) fatal "invalid flag: $opt" ;;
    esac
  done
  local parentDir=$(realpath "$(dirname $0)/..");
  if [ $(basename $parentDir) != $PROJ_DIRNAME ]; then
    fatal "wrong directory";
  fi
  if [ $skipUserContinuePrompt != true ]; then
    echo "This will DESTROY your current database"
    read -p "Are you sure? [y/N] " -n 1 -r user_continue_input
    echo
    if [[ ! $user_continue_input =~ ^[Yy]$ ]]; then
      echo "goodbye"
      exit 0
    fi
  fi
  local dkcDownCmd="docker compose down --rmi all --remove-orphans postgres"
  local dkcUpCmd="docker compose up -d --build --no-deps --force-recreate postgres"
  pRun $dkcDownCmd;
  pRun rm -rf ./ezd_api_pg_db_data
  pRun $dkcUpCmd;
}

main "$@"
