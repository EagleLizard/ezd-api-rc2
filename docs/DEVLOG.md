# developer log

This document exists to track tasks & thoughts in lieu of a task management system.

The format is roughly reverse-chronological by date.

## [08/17/2025]

### 3 - Inspiration Shout-out

I'd like to recognized **Sophie Koonin** who posted an article on their website, [This website is for humans](https://localghost.dev/blog/this-website-is-for-humans/) and whose website, [localghost.dev](https://localghost.dev), inspired me to pick up work on putting together my blog/site again.

Thanks, Sophie.

### 2 - Frontend website thoughts

My original site concept, which as of today is up at `beta.eaglelizard.com`, renders a windows98-esque GUI that I found pleasing and interesting. It also has a clock widget I am proud of. I wrote it in React using Tanstack router.

Over time I have come to the conclusion that this GUI concept is not great for a website. It is also difficult to manage all of the rules of the mocked GUI operating system / window manager. This is partly because there's no concept of running programs or isolated window environments, nor do I want that. If I want this sort of experience in the future, I would like to make it strictly _optional_. Perhaps a "launch in xyz" button or something.

For the next iteration of my site, I am torn between a few options. To state some non-goals:

1. I _do not_ want to use a pre-packaged static site generator (a la Hugo)
    1. This lacks flexibility and adds dependencies outside of my control that I'd rather not manage
    1. The main benefits are going to be rich feature sets that I probably won't even use
    1. I desire control of how I organize and manage my theme(s)
    1. I don't want o have to deal with plugins/add-ons that may or may not work next year
1. I _do not_ want some hybrid SSR solution (Next.js, Sveltekit, etc.)
    1. I think SSR, hydration, etc. in its current iteration is a fad
    1. I do not find the problems it solves (or creates) interesting or fun to solve
    1. I believe that the server and backend code should be separated. Install `React` or `svelte` on my server is an anti-pattern.

### 1 - Schedule jobs (NodeJS)

I want to schedule some operations to happen every so often. The naïve approach would be to use `setTimeout` or `setInterval`, and either set jobs to run some time in the future, or poll every short amount of time and check some persistent struct to see if work should be done. This feels a bit sloppy and wasteful WRT resources.

I have looked at both [`node-schedule`](https://www.npmjs.com/package/node-schedule) and [`cron`](https://www.npmjs.com/package/cron) libraries. They both look _excellent_. I have chosen to try out `cron` first, because the types appear to be bundled with the library whereas `node-schedule` would necessitate adding an `@types/` dev dependency.

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
