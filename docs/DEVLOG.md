# developer log

This document exists to track tasks & thoughts in lieu of a task management system.

The format is roughly reverse-chronological by date.

## [09/01/2025]

### 2 - `/src/lib/module/` is a bad name imo

I saw this convention somewhere and copied it; the original intent was to have a folder in the project-specific code that didn't fit into `/src/util/` or any of the other server directories.

This makes sense in a very literal sense, each file or subdirectory is a "module" in the sense that it's a self-contained, decoupled unit of code. The reason it's a bad name is because "module" is a _very_ overloaded term in the JavaScript world, and is thus ambiguous to the point of meaning the same thing as "helper" or "util".

My solution is to rename it `/src/lib/lib/`. This is still not a great name, but it is at least (slightly) less ambiguous in the context of JS and means roughly the same thing. `lib` is also less characters.

### 1 - AuthZ Admins and Super Users

I want to avoid managing RBAC (Role-Based Access Control) via manual database operations as much as possible. I'd actually like to avoid _most manual database operations._ This presents an issue when the database initializes - there is no user with sufficient access to perform administrative operations via the API.

To solve this I will designate a special user name; when this user is created, it will automatically be assigned a role with elevated permissions.

The user will:

1. (probably) be the only user with the elevated role
1. be created close in time to when the server starts for the first time
1. be only accessible to server admins (me)

Via [KISS](https://en.wikipedia.org/wiki/KISS_principle), I'll probably name the user `ezd_admin` and the role... `SuperUser` or `ServerAdmin`.

## [08/30/2025]

### 1 - Authorization (AuthZ), Roles

I've read multiple sources that indicate assigning a single role to a user is a design flaw. The recommended approach appears to be a many-to-many relationship between users and roles, and a many-to-many relationship between roles and permissions.

This is obvious now that I am thinking about it more deeply based on my experience with identity systems. It may be overkill for my use-case; I'm currently considering a superuser/admin type, and all other users, but I don't see any reason not to consider a better design at this stage.

There's likely _a lot_ of prior art on the topic; if I can I will find something standard and well-defined to follow to avoid reinventing the wheel here.

see:
- [geeksforgeeks article on identity management](https://www.geeksforgeeks.org/dbms/how-to-design-a-database-for-identity-management-systems/)
- [stackoverflow comment on role/permission management](https://stackoverflow.com/a/12991742/4677252)
- https://vertabelo.com/blog/user-authentication-module/

## [08/29/2025]

### 2 - Authentication (AuthN) (pt. 2)

I have considered my AuthN strategy again after doing a lot of research & tinkering. Some conclusions:

1. JWT alone doesn't get me much because I want _session invalidation_. Because I require a call to the DB to check if a token is valid or not, JWTs will mainly add overhead
1. While I don't like cookies, they are standard and have security features.
    1. TLS when used with https
    1. CORS

I still don't relish cookies and session ids as the _only_ authentication mechanism. This is not based on any security principle I could find a source for; additional security mechanisms that I've considered only add [security through obscurity](https://en.wikipedia.org/wiki/Security_through_obscurity). It's all predicated on TLS guarantees.

Still, I would like the ability to use api tokens. For this purpose, JWT is just as good as any other type of token for my purposes.

some links:
- [auth0 jwt-decode library](https://github.com/auth0/jwt-decode/blob/main/lib/index.ts)
    - good typescript type reference
- [auth0 node-jsonwebtoken library](https://github.com/auth0/node-jsonwebtoken/blob/master/sign.js)
    - reference implementation

### 1 - Authentication (AuthN)

I found [this comment on reddit](https://www.reddit.com/r/rust/comments/11fqt51/comment/jalvfys/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button) to be informative on jwt auth vs. session auth.

## [08/26/2025]

### 1.1 - Authentication (AuthN) (pt. 2)

Based on the notes in the previous section I think the sensible choice is the access+refresh approach with 2 JWTs. This may be overkill for my use case, because realistically I will only have a couple of users that I control very tightly.

### 1 - Authentication (AuthN)

Resources:

* [Reddit discussion on JWT auth in NodeJS](https://www.reddit.com/r/node/comments/1dn5dry/how_are_jwt_token_professionally_used_to/) from 6/23/2024
* [Medium guide demonstrating refresh token approach in NodeJS](https://medium.com/@techsuneel99/jwt-authentication-in-nodejs-refresh-jwt-with-cookie-based-token-37348ff685bf) from 2/3/2023
* [Youtube tutorial with source code links](https://www.youtube.com/watch?v=favjC6EKFgw) from 3/5/2025
    * associated repo: https://github.com/gitdagray/express_jwt

I am thinking of two approaches to handling JWT authentication:

1. 1 JWT - JWT Session
1. 2 JWT - Access+Refresh

#### 1 JWT - JWT Session

A single JWT is issued at login. The JWT has a certain expiry, and can be exchanged for a new JWT as needed. The JWT is associated with a database entry for invalidation.

__Pros:__

1. Simple
1. Implemented this already in previous iteration of this API

__Cons:__

1. Session invalidation requires hits to the DB
    1. Each access request requires a check against a jwt_session table to see if the session is invalid
1. Long-lived sessions not feasibly secure
    1. Shorter JWT session expiry
    1. The client needs to be aware of expiry, and make an API call to exchange the token before it expires. If the token expires before this, re-login is required
1. JWT alone may not be sufficient for access token
    1. If the JWT is leaked, it can be used for access _and_ exchange sans other verification
    1. More complexity needed to prevent misuse, like associating the JWT with the user's `sessionId`

#### 2 JWT - Access+Refresh

A refresh token is issued at login securely _via http-only cookie_. An access token may also be issued. The access token is used to make API calls, and expires quickly. The refresh token is used to obtain a new access token as needed.

__Pros:__

1. No DB calls required for access
    1. access tokens are short-lived, invalidate quickly
1. More secure
    1. Access tokens are short-lived, stored in app memory
    1. Refresh tokens only obtainable from the cookie

__Cons:__

1. Refresh token invalidation still requires calls to DB
1. More complex

## [08/23/2025]

### 1

__Usernames:__ I've decided to be _less_ permissive. English alphanumerical, underscores`_` allowed.

__Entity IDs:__ I'm using `serial` because it's simple and I don't need universal uniqueness nor is guessability a concern for me right now.

I might change my mind and try something else out. It's less important to me atm than just moving forward.

## [08/22/2025]

### Entity IDs (database)

In previous iterations of this API, as well as other APIs, I have defaulted to using UUIDs (v4). I find these unsightly.

I much prefer the stripe variant, with or without a prefix: `<prefix>_<chars>`.

I will stick to serial ids for now.


## [08/20/2025]

### Passwords

The most significant factor in password strength is length according to NIST. Additionally, character composition requirements encourage negative outcomes for security. The [guidelines on this Microsoft365 page](https://learn.microsoft.com/en-us/microsoft-365/admin/misc/password-policy-recommendations?view=o365-worldwide#requiring-the-use-of-multiple-character-sets) provide a good explainer on this.

### Password validation strategy:

1. Avoid single words
    1. I could use a dictionary, but I'd only check english...
1. disallow obviously bad cases
    1. repeated chars e.g. `aaaaaaaaaa`
1. avoid common passwords
    1. how do I keep a maintained list?
        1. SecLists provides a lot of resources

Resources:

1. https://github.com/danielmiessler/SecLists/tree/master/Passwords

## [08/19/2025]


### 2 - Username validation

Previously I've used alphanumeric characters of the ASCII variety. This is not inclusive and I'm moving away from it because I think that convention is part of Anglo-supremacy and western colonial hegemony.

It's also simply not correct when considering the expression of the majority of global internet users.

Luckily, modern JavaScript & other languages now have really good support for unicode character classes!

```js
\\p{L}[\p{L}\p{N}{2}_]\u
```

#### 2.1 - Username notes

I have agonized many times over whether or not `username` or `userName` is proper in the context of code. I have not found the right answer, but I've encountered both in large production codebases.

I've settled on `userName`/`user_name` over `username`. The reason is that, in general, I find it more intuitive to thing of it as a property that a `user` has, `user.name`. This is not perfect thinking, but something about `username` in code _feels wrong_ in a way that doesn't apply to other properties, like `password`.

### 1 - Email Address Validation

This was a bit of a rabbit hole. My previous implementation did some complicated checks to determine if an email address was syntactically correct; however, this implementation excluded many valid addresses.

My conclusion is that it is best to err on the side of permissiveness in this case.

I added a comment in the code, but I would like to add it here as well:

```
/*
previously: https://stackoverflow.com/a/46181/4677252
  However, as the comments point out, this is not sufficient to match the
    standard. According to some replies, the only source of truth for valid
    email addresses is the email providers themselves. I find this definition
    reductive and not useful.
  This reply lists some standards: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript/46181#comment3855831_46181
  Wikipedia has a list of valid email addresses: https://en.wikipedia.org/wiki/Email_address#Valid_email_addresses
  Conclusion:
    Almost any address is valid. This is frustrating but useful.
      It also simplifies the implementation. It is incumbent upon the user to
      enter their email address, and they may enter a typo anyway. The user
      may also enter a "valid" email address with a domain part that does not
      conform.
    Via RFC5322 section 3.4.1: "It is therefore
      incumbent upon implementations to conform to the syntax of
      addresses for the context in which they are used."
  Standards & References:
    RFC822 (1982)
    RFC2822 (2001) https://datatracker.ietf.org/doc/html/rfc2822
    RFC5322 (2008) https://datatracker.ietf.org/doc/html/rfc5322
*/
```

## [08/18/2025]

### 1 - Schedule jobs (pt. 2)

I may not want to use `cron` after all:

1. `cron` has a dependency on `Luxon`, which is... fine. I'd rather not have it, but it's not a dealbreaker.
1. `cron` states that it uses `child_process`, which is also not the biggest deal. I believe the newer `worker_threads` API is the golden standard in NodeJS, though.

The consensus in the community threads (reddit, stackoverflow, etc.) seems to favor `BullMQ`, a redis integration, and generally called out scheduling jobs directly in nodejs service code as a bad pattern.

I am not using redis or any other distributed memory store, no do I wish to. There is a point to be made here, however: running scheduled operations in this way could make it so that my server is no longer stateless.

## [08/17/2025]

### 4

Apparently it is not possible to create a table named `user` is postgresql.

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
