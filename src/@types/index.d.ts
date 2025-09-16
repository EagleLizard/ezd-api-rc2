
import '@fastify/session';
import '@fastify/cookie';
import { Session } from 'fastify';

/* extend fastify types */
declare module 'fastify' {
  interface Session {
    ip: string;
    userAgent?: string;
    /*
    This is not provided in the typescript types, but exists and is defined
      in the documentation
    _*/
    isSaved: () => boolean;
  }
}
