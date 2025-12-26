
import { QueryResult } from 'pg';
import { UserDto } from '../models/user-dto';
import { IPgClient } from './pg-client';
import { EzdError } from '../models/error/ezd-error';
import { ezdErrorCodes } from '../models/error/ezd-error-codes';
import { SessionDto, SessionDtoSchema } from '../models/session-dto';
import { UserLoginDto, UserLoginDtoSchema } from '../models/user-login-dto';
import { prim } from '../../util/validate-primitives';

export const authRepo = {
  getUserIdFromLoginBySid: getUserIdFromLoginBySid,
  logoutSession: logoutSession,
  getSession: getSession,
  getUserLogin: getUserLogin,
  insertUserLogin: insertUserLogin,
} as const;

async function getUserIdFromLoginBySid(
  pgClient: IPgClient,
  sid: string
): Promise<UserDto['user_id'] | undefined> {
  let rawUserId: unknown;
  let userId: string | undefined;
  let queryVals: [ sid: string ];
  let queryStr = `
    select u.user_id from users u
      INNER JOIN user_login ul ON ul.user_id = u.user_id
      INNER JOIN session s ON s.sid = ul.sid
        where s.sid = $1
        AND ul.logged_out != true
  `;
  queryVals = [ sid ];
  let queryRes = await pgClient.query(queryStr, queryVals);
  rawUserId = queryRes.rows[0]?.user_id;
  if(rawUserId !== undefined && !prim.isString(rawUserId)) {
    console.log(queryRes.rows[0]);
    throw new EzdError('Invalid type received from DB.'
      + ` Expected 'string', received value ${queryRes.rows[0]}`
      + ` with type ${typeof queryRes.rows[0]}`
    );
  }
  userId = rawUserId;
  return userId;
}

async function logoutSession(
  pgClient: IPgClient,
  sid: string,
  userId: UserDto['user_id'],
): Promise<void> {
  let queryStr = `
    update user_login as ul set
      logged_out = TRUE,
      logged_out_at = CURRENT_TIMESTAMP,
      modified_at = CURRENT_TIMESTAMP
    where ul.user_login_id = (
      select ul2.user_login_id from user_login ul2
        where ul2.sid = $1
        AND ul2.user_id = $2
        AND ul2.logged_out = false
      order by ul2.modified_at desc
      limit 1
    )
  `;
  let queryParams: [ string, UserDto['user_id'] ] = [
    sid,
    userId,
  ];
  await pgClient.query(queryStr, queryParams);
}

async function getSession(pgClient: IPgClient, sid: string): Promise<SessionDto | undefined> {
  let queryStr: string;
  let queryParams: [ string ];
  let sessionDto: SessionDto;
  let queryRes: QueryResult;
  queryStr = `
    select * from session s
      where s.sid = $1
  `;
  queryParams = [ sid ];
  queryRes = await pgClient.query(queryStr, queryParams);
  if(queryRes.rows[0] === undefined) {
    return undefined;
  }
  sessionDto = SessionDtoSchema.decode(queryRes.rows[0]);
  return sessionDto;
}

async function getUserLogin(
  pgClient: IPgClient,
  userId: UserDto['user_id'],
  sessionId: string,
): Promise<UserLoginDto | undefined> {
  let queryVals: [
    sid: string,
    userId: UserDto['user_id'],
  ];
  let queryStr = `
    select * from user_login ul
      where ul.sid = $1
      AND ul.user_id = $2
      AND ul.logged_out = false
    limit 1
  `;
  queryVals = [
    sessionId,
    userId,
  ];
  let queryRes = await pgClient.query(queryStr, queryVals);
  if(queryRes.rows.length < 1) {
    return undefined;
  }
  let userLoginDto = UserLoginDtoSchema.decode(queryRes.rows[0]);
  return userLoginDto;
}

async function insertUserLogin(
  pgClient: IPgClient,
  userId: UserDto['user_id'],
  sessionId: string,
  ipAddr: string,
): Promise<UserLoginDto> {
  let queryVals: [
    userId: UserDto['user_id'],
    sid: string,
    ipAddr: string,
  ];
  let colNames = [
    'user_id',
    'sid',
    'ip_addr',
  ];
  let colNamesStr = colNames.join(', ');
  let colNumsStr = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
  let queryStr = `
    insert into user_login (${colNamesStr}) values(${colNumsStr})
    returning *
  `;
  queryVals = [
    userId,
    sessionId,
    ipAddr,
  ];
  try {
    let queryRes = await pgClient.query(queryStr, queryVals);
    let userLogin = UserLoginDtoSchema.decode(queryRes.rows[0]);
    return userLogin;
  } catch(e) {
    throw new EzdError('Error inserting user_session', ezdErrorCodes.DB_ERROR, {
      cause: e,
    });
  }
}
