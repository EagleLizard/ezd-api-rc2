
# postgres

To run the db use docker compose (at project root):

```sh
docker compose up -d --build --no-deps --force-recreate postgres
```

## init database

> ⓘ `init.sql` should run on first mount

If the db isn't initialized (has no tables), run the `init.sql` inside the container. This file is copied into the container at the home `~` directory:

```sh
docker exec -it postgres_db bin/bash
```

Once inside the container:

```sh
psql ezd_db -Uezd < ~/init.sql
```

## stop database

Use docker compose, e.g.:

```sh
docker compose down --rmi all --remove-orphans postgres
```

## delete database

> ⚠️ destructive operation meant for dev

To delete, remove the volume directory the docker container mounts to:

```sh
rm -rf ./ezd_api_pg_db_data
```

## Logs

Tail errors:
```sh
tail -f logs/app.log | jq -r 'select(.level == "error") | .err.stack'
```

## Live reload html and static assets with vite

vite will live-reload html by default, run:

```sh
npx vite serve ./static
```
