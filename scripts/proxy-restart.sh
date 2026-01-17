#!/usr/bin/env bash

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
  local parentDir=$(realpath "$(dirname $0)/..");
  if [ $(basename $parentDir) != $PROJ_DIRNAME ]; then
    fatal "wrong directory";
  fi
  (
    cd proxy && (
      local dkcDownCmd="docker compose down --rmi all --remove-orphans proxy"
      local dkcUpCmd="docker compose up -d --build --no-deps --force-recreate proxy"
      pRun $dkcDownCmd;
      pRun $dkcUpCmd;
    );
  );
}

main "$@"
