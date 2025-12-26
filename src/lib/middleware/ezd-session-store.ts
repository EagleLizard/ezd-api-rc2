
import type * as Fastify from 'fastify';
import type * as FastifySession from '@fastify/session';
import { SessionDto } from '../models/session-dto';
import { PgClient } from '../db/pg-client';
import { prim } from '../../util/validate-primitives';
import { sessionRepo } from '../db/session-repo';

const ONE_DAY_SECS = 60 * 60 * 24;
/*
TODO: remove this?
  - key off of cookie expiry
  - change to something else or clarify why this column exists
_*/
const SESSION_EXPIRE_DEFAULT = ONE_DAY_SECS;

export class EzdSessionStore implements FastifySession.SessionStore {
  get(sid: string, cb: (err?: unknown, res?: Fastify.Session | null) => void) {
    sessionRepo.getSession(PgClient, sid).then((seshDto) => {
      let fSesh: Fastify.Session;
      if(seshDto === undefined) {
        return cb();
      }
      fSesh = seshDtoToFastifySession(seshDto);
      cb(null, fSesh);
    }).catch((err) => {
      cb(err);
    });
  }
  set(sid: string, sesh: Fastify.Session, cb: (err?: unknown) => void) {
    let expireTime = getExpireTime(sesh);
    sessionRepo.insertSession(PgClient, sid, sesh, expireTime).then(() => {
      cb();
    }).catch((err) => {
      cb(err);
    });
  }
  destroy(sid: string, cb: (err?: unknown) => void): void {
    sessionRepo.deleteSession(PgClient, sid).then(() => {
      cb();
    }).catch((err) => {
      cb(err);
    });
  }
}

function seshDtoToFastifySession(seshDto: SessionDto): Fastify.Session {
  let fSesh: Fastify.Session;
  /*
  Fastify.Session wants a Date, & i don't want to screw around w/ typebox transforms
    & string formats
  _*/
  let cookieExpiresVal = prim.isString(seshDto.sesh.cookie.expires)
    ? new Date(seshDto.sesh.cookie.expires)
    : undefined
  ;
  /*
  Fastify.Session will set cookie.domain to null, but that is not acceptable in the typings.
  _*/
  let cookieDomain = prim.isString(seshDto.sesh.cookie.domain)
    ? seshDto.sesh.cookie.domain
    : undefined
  ;
  fSesh = {
    ip: seshDto.ip_addr,
    userAgent: seshDto.user_agent ?? undefined,
    cookie: {
      ...seshDto.sesh.cookie,
      expires: cookieExpiresVal,
      domain: cookieDomain,
    },
  };
  return fSesh;
}

function getExpireTime(sesh: Fastify.Session): number {
  let expireTime: number;
  expireTime = (
    (sesh?.cookie?.expires === undefined)
    || (sesh?.cookie?.expires === null)
  )
    ? Math.floor((Date.now() / 1000) + SESSION_EXPIRE_DEFAULT)
    : Math.floor(
      (new Date(sesh.cookie.expires)).valueOf() / 1000
    )
  ;
  return expireTime;
}
