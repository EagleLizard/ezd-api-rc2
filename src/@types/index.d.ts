
import '@fastify/session';
import '@fastify/cookie';
import type * as Fastify from 'fastify';
import { RequestContext } from '../lib/models/request-context';

/* extend fastify types */
declare module 'fastify' {
  interface Session {
    ip: string;
    userAgent?: string;
  }
  interface FastifyRequest {
    ctx: RequestContext;
  }
}
