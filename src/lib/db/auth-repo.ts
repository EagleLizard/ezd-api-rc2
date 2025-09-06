
import { QueryResult } from 'pg';
import { UserDto } from '../models/user-dto';
import { IPgClient } from './pg-client';
import { EzdError } from '../models/error/ezd-error';
import { ezdErrorCodes } from '../models/error/ezd-error-codes';

export const authRepo = {
  insertUserSession: insertUserSession,
} as const;

async function insertUserSession(
  pgClient: IPgClient,
  userId: UserDto['user_id'],
  sessionId: string
) {
  let queryVals: [ UserDto['user_id'], string ];
  let queryRes: QueryResult;
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
    queryRes = await pgClient.query(queryStr, queryVals);
  } catch(e) {
    throw new EzdError('Error inserting session', ezdErrorCodes.DB_ERROR, {
      cause: e,
    });
  }
}
