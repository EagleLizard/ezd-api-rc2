
import type * as Fastify from 'fastify';

import { IPgClient } from './pg-client';
import { prim } from '../../util/validate-primitives';
import { EzdError } from '../models/error/ezd-error';
import { SessionDto, SessionDtoSchema } from '../models/session-dto';

/*
  TODO: come up with an elegant way of setting service module object
    class names for better logging. E.g.:
      export const myService = {
        myFn = myFn,
      } as const;
    Results in unhelpful info in logged stack traces:
      at Object.myFn

    see: https://github.com/mqttjs/MQTT.js/blob/aa03369f5f5daf9b8a98339990cc3ced800a5051/src/lib/TypedEmitter.ts#L71
_*/
// class SessionRepo {
//   insertSession = insertSession;
// }
// export const sessionRepo = new SessionRepo();
export const sessionRepo = {
  deleteSession: deleteSession,
  getSession: getSession,
  insertSession: insertSession
} as const;

function deleteSession(pgClient: IPgClient, sid: string) {
  let queryStr = `
    delete from session s where s.sid = $1
  `;
  return pgClient.query(queryStr, [ sid ]);
}

async function getSession(pgClient: IPgClient, sid: string): Promise<SessionDto | undefined> {
  let queryParams: [
    sid: string,
    expire: number,
  ];
  let queryStr = `
    select * from session s
      where s.sid = $1
      AND s.expire >= to_timestamp($2)
  `;
  queryParams = [
    sid,
    Math.floor(Date.now() / 1000),
  ];
  let queryRes = await pgClient.query(queryStr, queryParams);
  if(queryRes.rows[0] === undefined) {
    return;
  }
  let sessionDto = SessionDtoSchema.decode(queryRes.rows[0]);
  return sessionDto;
}

async function insertSession(
  pgClient: IPgClient,
  sid: string,
  sesh: Fastify.Session,
  expireTime: number
): Promise<string> {
  let queryParams: [
    sid: string,
    sesh: string,
    expire: number,
    ip_addr: string,
    user_agent: string|undefined
  ];
  let queryStr = `
    insert into session
      (sid, sesh, expire, ip_addr, user_agent) select $1, $2, to_timestamp($3), $4, $5
    on conflict (sid) do update set
      sesh=$2,
      expire=to_timestamp($3),
      modified_at=CURRENT_TIMESTAMP
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
  ];
  let queryRes = await pgClient.query(queryStr, queryParams);
  let resSid: string;
  if(!prim.isString(queryRes.rows[0]?.sid)) {
    throw new EzdError(
      `Invalid session id returned when inserting session, expected 'string'.`
      + `Received sid: ${queryRes.rows[0]?.sid}`
    );
  }
  resSid = queryRes.rows[0].sid;
  return resSid;
}
