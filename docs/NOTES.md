
# Notes

Started 12/02/2025

---

## Wishlist / things I want to play with

1. [] Websockets - make some of the views / elements / components realtime (web, cli. other clients)

## Logs

### helpful commands

Error logs:

```bash
tail -f logs/app.log | jq -r 'select(.level == "error")'
```

Error stack traces:

```bash
tail -f logs/app.log | jq -r 'select(.level == "error") | .err.stack'
```

## Authentication

### Sessions

`node-connect-pg-simple` session table definition: [[Link] `table.sql`](https://github.com/voxpelli/node-connect-pg-simple/blob/c46daef6d06d257a0fb946ad90b9fb9a652bbe90/table.sql)

## Roles, Permissions, RBAC

## Postgres

updating multiple: https://stackoverflow.com/a/26715934/4677252

```pgsql
update users as u set
  email = $1
```
