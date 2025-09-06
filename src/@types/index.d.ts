
import { Session } from 'fastify';

/* extend fastify types */
declare module 'fastify' {
  interface Session {
    ip: string;
    userAgent?: string;
  }
}
