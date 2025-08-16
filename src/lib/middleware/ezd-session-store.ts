
import type * as Fastify from 'fastify';
import type * as FastifySession from '@fastify/session';

const ONE_DAY_SECS = 60 * 60 * 24;
const SESSION_EXPIRE_DEFAULT = ONE_DAY_SECS;

export class EzdSessionStore implements FastifySession.SessionStore {
  // get(sid: string, cb)
  get(sid: string, cb: (err?: unknown, res?: Fastify.Session | null) => void) {
    console.log('get');
    // console.log({ sid });
    cb();
  }
  set(sid: string, sesh: Fastify.Session, cb: (err?: unknown) => void) {
    console.log('set');
    // console.log({
    //   sid, sesh
    // });
    cb();
  }
  destroy(sid: string, cb: (err?: unknown) => void): void {
    console.log('destroy');
    // console.log({ sid });
    cb();
  }
}
