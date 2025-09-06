
import crypto from 'node:crypto';

import { QueryResult } from 'pg';
import { PgClient } from './pg-client';
import { UserRoleDto, UserRoleDtoSchema } from '../models/user-role-dto';
import { PasswordDto, PasswordDtoSchema } from '../models/password-dto';
import { UserDto, UserDtoSchema } from '../models/user-dto';
import { authUtil } from '../lib/auth-util';
import { EzdError } from '../models/error/ezd-error';
import { ezdConfig } from '../config';

const pw_keylen = 64;
const pw_cost = 2**17;
const pw_block_size = 8;

export const userRepo = {
  createUser: createUser,
  getUserByName: getUserByName,
  getPasswordByUserId: getPasswordByUserId,
} as const;

async function getUserByName(userName: string): Promise<UserDto | undefined> {
  let userDto: UserDto;
  let queryStr: string;
  let queryRes: QueryResult;
  queryStr = `
    select * from users u where u.user_name = $1
      limit 1
  `;
  queryRes = await PgClient.query(queryStr, [ userName ]);
  if(queryRes.rows[0] === undefined) {
    return undefined;
  }
  userDto = UserDtoSchema.decode(queryRes.rows[0]);
  return userDto;
}

async function createUser(userName: string, email: string, password: string) {
  /*
  should be done in a transaction:
  1. create user in users table
  2. create password in password table
  _*/
  let userDto: UserDto;
  let txnClient = await PgClient.initClient();
  try {
    await txnClient.query('BEGIN');

    userDto = await insertUser(txnClient, userName, email);
    await insertPassword(txnClient, userDto.user_id, password);
    await createUserUserRole(txnClient, userDto);

    await txnClient.query('COMMIT');
  } catch(e) {
    await txnClient.query('ROLLBACK');
    console.log('rollback');
    throw e;
  } finally {
    txnClient.release();
  }
}

/* intended for initial user creation _*/
async function createUserUserRole(pgClient: PgClient, userDto: UserDto) {
  let roleDto: UserRoleDto | undefined;
  let roleName: string;
  let queryStr: string;
  let colNames: string[];
  let colNamesStr: string;
  let colNumsStr: string;
  let queryVals: [ number, number ];
  let queryRes: QueryResult;
  roleName = (userDto.user_name === ezdConfig.EZD_SUPER_USER_USERNAME)
    ? ezdConfig.EZD_SUPER_USER_ROLE_NAME
    : ezdConfig.EZD_DEFAULT_ROLE_NAME
  ;
  roleDto = await getRoleByName(roleName);
  if(roleDto === undefined) {
    throw new EzdError(`Error getting user_role: ${roleName}`);
  }
  colNames = [
    'user_id',
    'role_id'
  ];
  colNamesStr = colNames.join(', ');
  colNumsStr = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
  queryStr = `
    insert into users_user_role (${colNamesStr}) values(${colNumsStr}) returning *
  `;
  queryVals = [
    userDto.user_id,
    roleDto.role_id,
  ];
  queryRes = await pgClient.query(queryStr, queryVals);
  if(queryRes.rows.length < 1) {
    throw new EzdError(`Error creating role '${roleName}' for user: ${userDto.user_name}`);
  }
}

async function insertUser(
  pgClient: PgClient,
  userName: string,
  email: string,
): Promise<UserDto> {
  let queryStr: string;
  let queryVals: [ string, string ];
  let colNames: string[];
  let colNamesStr: string;
  let colNumsStr: string;
  let queryRes: QueryResult;
  let userDto: UserDto;

  colNames = [
    'user_name',
    'email',
  ];
  colNamesStr = colNames.join(', ');
  colNumsStr = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
  queryStr = `
    insert into users (${colNamesStr}) values(${colNumsStr}) returning *
  `;
  queryVals = [
    userName,
    email,
  ];
  queryRes = await pgClient.query(queryStr, queryVals);
  try {
    userDto = UserDtoSchema.decode(queryRes.rows[0]);
  } catch(e) {
    throw new EzdError(`Unable to create user: ${userName}`, {
      cause: e,
    });
  }
  return userDto;
}

async function getPasswordByUserId(userId: number): Promise<PasswordDto | undefined> {
  let passwordDto: PasswordDto;
  let queryStr: string;
  let queryRes: QueryResult;
  queryStr = `
    select * from password p
      where p.user_id = $1
      order by p.created_at
      limit 1
  `;
  queryRes = await PgClient.query(queryStr, [ userId ]);
  if(queryRes.rows[0] === undefined) {
    return undefined;
  }
  passwordDto = PasswordDtoSchema.decode(queryRes.rows[0]);
  return passwordDto;
}

/*
via owasp, scrypt is good: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
related reddit thread: https://www.reddit.com/r/node/comments/17m8b4p/best_node_hashing_algorithm_option/
_*/
async function insertPassword(pgClient: PgClient, userId: number, password: string) {
  let queryStr: string;
  let queryVals: [ string, string, number ];
  let colNames: string[];
  let colNamesStr: string;
  let colNumsStr: string;
  let queryRes: QueryResult;
  let passwordDto: PasswordDto;

  let salt: string;
  let passwordHashBuf: Buffer<ArrayBufferLike>;
  let passwordHash: string;
  // let passwordDto: PasswordDto;

  salt = crypto.randomBytes(128).toString('base64');
  passwordHashBuf = await authUtil.getPasswordHash(password, salt);
  passwordHash = passwordHashBuf.toString('base64');

  colNames = [
    'password_hash',
    'salt',
    'user_id',
  ];
  colNamesStr = colNames.join(', ');
  colNumsStr = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
  queryStr = `
    insert into password (${colNamesStr}) values(${colNumsStr}) returning *
  `;
  queryVals = [
    passwordHash,
    salt,
    userId,
  ];
  queryRes = await pgClient.query(queryStr, queryVals);
  passwordDto = PasswordDtoSchema.decode(queryRes.rows[0]);

  return passwordDto.password_id;
}

async function getPasswordHash(password: string, salt: string): Promise<string> {
  let passwordHash: string;
  let pwHashPromise: Promise<Buffer<ArrayBufferLike>>;
  pwHashPromise = new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, pw_keylen, {
      cost: pw_cost,
      blockSize: pw_block_size,
      maxmem: 129 * 1024 * 1024,
    }, (err, derivedKey) => {
      if(err) {
        return reject(err);
      }
      resolve(derivedKey);
    });
  });
  passwordHash = (await pwHashPromise).toString('base64');
  return passwordHash;
}

async function getRoleByName(roleName: string): Promise<UserRoleDto | undefined> {
  let queryStr: string;
  let queryRes: QueryResult;
  queryStr = `
    select role_id, role_name, created_at, modified_at from user_role ur
      where ur.role_name like $1
      limit 1
  `;
  queryRes = await PgClient.query(queryStr, [ roleName ]);
  if(queryRes.rows.length < 1) {
    return;
  }
  return UserRoleDtoSchema.decode(queryRes.rows[0]);
}
