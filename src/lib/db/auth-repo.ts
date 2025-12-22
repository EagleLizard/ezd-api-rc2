
import { QueryResult } from 'pg';
import { UserDto } from '../models/user-dto';
import { IPgClient } from './pg-client';
import { EzdError } from '../models/error/ezd-error';
import { ezdErrorCodes } from '../models/error/ezd-error-codes';
import { SessionDto, SessionDtoSchema } from '../models/session-dto';

export const authRepo = {
  getSession: getSession,
  insertUserSession: insertUserSession,
} as const;

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

async function insertUserSession(
  pgClient: IPgClient,
  userId: UserDto['user_id'],
  sessionId: string
) {
  let queryVals: [ UserDto['user_id'], string ];
  let colNames = [
    'user_id',
    'session_id'
  ];
  let colNamesStr = colNames.join(', ');
  let colNumsStr = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
  let queryStr = `
    insert into user_session (${colNamesStr}) values(${colNumsStr})
      on conflict do nothing
    returning *
  `;
  queryVals = [
    userId,
    sessionId,
  ];
  try {
    await pgClient.query(queryStr, queryVals);
  } catch(e) {
    throw new EzdError('Error inserting user_session', ezdErrorCodes.DB_ERROR, {
      cause: e,
    });
  }
}
