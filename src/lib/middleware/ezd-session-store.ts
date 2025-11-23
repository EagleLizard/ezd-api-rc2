
import type * as Fastify from 'fastify';
import type * as FastifySession from '@fastify/session';
import { SessionDto, SessionDtoSchema } from '../models/session-dto';
import { PgClient } from '../db/pg-client';
import { QueryResult } from 'pg';
import { prim } from '../../util/validate-primitives';
import { UserDto } from '../models/user-dto';

const ONE_DAY_SECS = 60 * 60 * 24;
/*
TODO: remove this?
  - key off of cookie expiry
  - change to something else or clarify why this column exists
_*/
const SESSION_EXPIRE_DEFAULT = ONE_DAY_SECS;

export class EzdSessionStore implements FastifySession.SessionStore {
  get(sid: string, cb: (err?: unknown, res?: Fastify.Session | null) => void) {
    getSession(sid).then((seshDto) => {
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
    let expireTime: number;
    expireTime = getExpireTime(sesh);
    insertSession(sid, sesh, expireTime).then(() => {
      cb();
    }).catch((err) => {
      cb(err);
    });
  }
  destroy(sid: string, cb: (err?: unknown) => void): void {
    deleteSession(sid).then(() => {
      cb();
    }).catch((err) => {
      cb(err);
    });
  }
}

function deleteSession(sid: string) {
  let queryStr: string;
  queryStr = `
    delete from session s where s.sid = $1
  `;
  return PgClient.query(queryStr, [ sid ]);
}

async function insertSession(sid: string, sesh: Fastify.Session, expireTime: number) {
  let queryStr: string;
  let queryParams: [
    string, string, number, string, string|undefined, UserDto['user_id']|undefined
  ];
  let queryRes: QueryResult;
  queryStr = `
    insert into session
      (sid, sesh, expire, ip_addr, user_agent, user_id) select $1, $2, to_timestamp($3), $4, $5, $6
      on conflict (sid) do update set
        sesh=$2,
        expire=to_timestamp($3),
        modified_at=CURRENT_TIMESTAMP,
        user_id=$6
    returning sid
  `;
  queryParams = [
    sid,
    JSON.stringify({
      cookie: sesh.cookie,
    }),
    expireTime,
    sesh.ip,
    sesh.userAgent,
    sesh.user_id,
  ];
  queryRes = await PgClient.query(queryStr, queryParams);
  return queryRes;
}

async function getSession(sid: string): Promise<SessionDto | undefined> {
  let queryStr: string;
  let queryParams: [ string, number ];
  let sessionDto: SessionDto;
  let queryRes: QueryResult;
  queryStr = `
    select * from session s
      where s.sid = $1
      and s.expire >= to_timestamp($2)
  `;
  queryParams = [
    sid,
    Math.floor(Date.now() / 1000),
  ];
  queryRes = await PgClient.query(queryStr, queryParams);
  if(queryRes.rows[0] === undefined) {
    return;
  }
  sessionDto = SessionDtoSchema.decode(queryRes.rows[0]);
  return sessionDto;
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
    user_id: seshDto.user_id ?? undefined,
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
