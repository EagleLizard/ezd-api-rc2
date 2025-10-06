
import '@fastify/session';
import '@fastify/cookie';
import { Session } from 'fastify';
import { UserDto } from '../lib/models/user-dto';
import { RequestContext } from '../lib/models/request-context';

/* extend fastify types */
declare module 'fastify' {
  interface Session {
    ip: string;
    userAgent?: string;
    user_id?: UserDto['user_id'];
  }
  interface FastifyRequest {
    // user?: UserDto;
    ctx: RequestContext;
  }
}
