#!/usr/bin/env bash
set -e
base_dir=$(realpath "$(dirname $0)/..");
PROJ_DIRNAME=ezd-api-rc2

fatal() {
	echo '[FATAL]' "$@" >&2
	exit 1
}
pRun() {
  echo "_> $@"
  eval $@
}

# verification script:
# 1. unit tests
# 2. api tests - is this the right spot?
main() {
  echo "$(basename $base_dir)"
  if [ $(basename $base_dir) != $PROJ_DIRNAME ]; then
    fatal "wrong directory"
  fi
  (
    cd $base_dir && (
      pRun npm test;
    );
  );
}
main
