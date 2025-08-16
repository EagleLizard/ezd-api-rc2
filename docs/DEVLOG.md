# developer log

This document exists to track tasks & thoughts in lieu of a task management system.

The format is roughly reverse-chronological by date.

## [08/15/2025]

### 1 - SQL (postgres)

I am going to use postgresql for the same reason I'm using fastify. It's a good choice in general.

As for the nodejs client, I took a look at [`postgres.js`](https://github.com/porsager/postgres) as an alternative to [`node-postgres`/`pg`](https://github.com/brianc/node-postgres) and it looked promising and claimed to be the "fastest" client library. I found [this discussion comparing postgres node clients](https://github.com/brianc/node-postgres/issues/3391) helpful in understanding why that _may not be totally accurate_.

There are some things I don't like from an ergonomics PoV; primarily, `postgres.js` dictates the use of tagged templates ([MDN link](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)). This is clever, and provides sanitization if used correctly, but I don't like that it's _the only supported interface_ in the library.

My thinking on this is:

1. If an interface depends on strings, expose canonical & direct APIs for dealing with strings.
1. Trying to push sanitization at the API level is a code smell.
    1. What problem are we solving? Removing a footgun for new devs? Juniors should learn that SQL itself is a footgun and learning hard lessons about sanitization is a good thing.

Thus I will be going with the `pg` lib. The only con for me is that the types are not bundled with the project. That could also be considered a pro.


## [08/14/2025]

I am starting this using `fastify`. The main reason is compatibility with previous code.
