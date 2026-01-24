
PROJ_DIRNAME=ezd-api-rc2

api_image_name=ezd_api_rc2
api_container_name=ezd-api-rc2
db_image_name=ezd_api_rc2_postgres
db_container_name=postgres_db

# scripts_dir=$(realpath "$(dirname $0)")

echo $(date -u +"%Y-%m-%dT%H:%M:%SZ")

fatal() {
	echo '[FATAL]' "$@" >&2
	exit 1
}
pRun() {
  echo "_> $@"
  eval $@
}
