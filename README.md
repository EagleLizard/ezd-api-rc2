# ezd-api-rc2

## Getting started

```sh
pnpm i
```

## scripts

### Postgres DB container

Build:

```sh
./scripts/build-db-image.sh
```

Run:

```sh
./scripts/run-db-image.sh
```

Stop:

```sh
./scripts/run-db-image.sh stop
```

### Service Container

Build:

```sh
./scripts/run-api-image.sh -b
```

Run:

```sh
./scripts/run-api-image.sh -r
```

Stop:

```sh
./scripts/run-api-image.sh -s
```