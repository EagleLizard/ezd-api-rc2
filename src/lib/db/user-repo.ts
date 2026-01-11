
import crypto from 'node:crypto';

import { IPgClient, PgClient } from './pg-client';
import { UserRoleDto, UserRoleDtoSchema } from '../models/user/user-role-dto';
import { PasswordDto, PasswordDtoSchema } from '../models/password-dto';
import { UserDto, UserDtoSchema } from '../models/user-dto';
import { authUtil } from '../lib/auth-util';
import { EzdError } from '../models/error/ezd-error';
import { idGen } from '../lib/id-gen';

export const userRepo = {
  createUser: createUser,
  deleteUser: deleteUser,
  getUserById: getUserById,
  getUserByName: getUserByName,
  getPasswordByUserId: getPasswordByUserId,
} as const;

async function getUserById(
  pgClient: IPgClient,
  userId: UserDto['user_id']
): Promise<UserDto | undefined> {
  let queryStr = `
    select * from users u
      where u.user_id = $1
    limit 1
  `;
  let queryRes = await pgClient.query(queryStr, [ userId ]);
  if(queryRes.rows[0] === undefined) {
    return undefined;
  }
  let userDto = UserDtoSchema.decode(queryRes.rows[0]);
  return userDto;
}

async function getUserByName(userName: string): Promise<UserDto | undefined> {
  let queryStr = `
    select * from users u where u.user_name = $1
      limit 1
  `;
  let queryRes = await PgClient.query(queryStr, [ userName ]);
  if(queryRes.rows[0] === undefined) {
    return undefined;
  }
  let userDto = UserDtoSchema.decode(queryRes.rows[0]);
  return userDto;
}

async function createUser(
  userName: string,
  email: string,
  password: string,
  roleNames: string[]
): Promise<UserDto> {
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
    for(let i = 0; i < roleNames.length; i++) {
      let roleName = roleNames[i];
      await createUserUserRole(txnClient, userDto, roleName);
    }

    await txnClient.query('COMMIT');
  } catch(e) {
    await txnClient.query('ROLLBACK');
    console.log('rollback');
    throw e;
  } finally {
    txnClient.release();
  }
  return userDto;
}

async function deleteUser(pgClient: IPgClient, userId: UserDto['user_id']): Promise<void> {
  let queryStr = `
    delete from users u where u.user_id = $1
  `;
  let queryVals: [user_id: string] = [ userId ];
  await pgClient.query(queryStr, queryVals);
}

/* intended for initial user creation _*/
async function createUserUserRole(pgClient: PgClient, userDto: UserDto, roleName: string) {
  let roleDto = await getRoleByName(roleName);
  if(roleDto === undefined) {
    throw new EzdError(`Error getting user_role: ${roleName}`);
  }
  let colNames = [
    'user_id',
    'role_id'
  ];
  let colNamesStr = colNames.join(', ');
  let colNumsStr = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
  let queryStr = `
    insert into users_user_role (${colNamesStr}) values(${colNumsStr}) returning *
  `;
  let queryVals: [ string, number ] = [
    userDto.user_id,
    roleDto.role_id,
  ];
  let queryRes = await pgClient.query(queryStr, queryVals);
  if(queryRes.rows.length < 1) {
    throw new EzdError(`Error creating role '${roleName}' for user: ${userDto.user_name}`);
  }
}

async function insertUser(
  pgClient: IPgClient,
  userName: string,
  email: string,
): Promise<UserDto> {
  let colNames = [
    'user_id',
    'user_name',
    'email',
  ];
  let colNamesStr = colNames.join(', ');
  let colNumsStr = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
  let queryStr = `
    insert into users (${colNamesStr}) values(${colNumsStr})
    returning *
  `;
  let userId: string = idGen.rd2();
  let queryVals: [ userId: string, string, string ] = [
    userId,
    userName,
    email,
  ];
  let queryRes = await pgClient.query(queryStr, queryVals);
  let userDto: UserDto;
  try {
    userDto = UserDtoSchema.decode(queryRes.rows[0]);
  } catch(e) {
    throw new EzdError(`Unable to create user: ${userName}`, {
      cause: e,
    });
  }
  return userDto;
}

async function getPasswordByUserId(userId: string): Promise<PasswordDto | undefined> {
  let queryStr = `
    select * from password p
      where p.user_id = $1
      order by p.created_at
      limit 1
  `;
  let queryRes = await PgClient.query(queryStr, [ userId ]);
  if(queryRes.rows[0] === undefined) {
    return undefined;
  }
  let passwordDto = PasswordDtoSchema.decode(queryRes.rows[0]);
  return passwordDto;
}

/*
via owasp, scrypt is good: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
related reddit thread: https://www.reddit.com/r/node/comments/17m8b4p/best_node_hashing_algorithm_option/
_*/
async function insertPassword(pgClient: PgClient, userId: string, password: string) {
  let salt = crypto.randomBytes(128).toString('base64');
  let passwordHashBuf = await authUtil.getPasswordHash(password, salt);
  let passwordHash = passwordHashBuf.toString('base64');

  let colNames = [
    'password_hash',
    'salt',
    'user_id',
  ];
  let colNamesStr = colNames.join(', ');
  let colNumsStr = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
  let queryStr = `
    insert into password (${colNamesStr}) values(${colNumsStr}) returning *
  `;
  let queryVals: [ string, string, string ] = [
    passwordHash,
    salt,
    userId,
  ];
  let queryRes = await pgClient.query(queryStr, queryVals);
  let passwordDto = PasswordDtoSchema.decode(queryRes.rows[0]);

  return passwordDto.password_id;
}

async function getRoleByName(roleName: string): Promise<UserRoleDto | undefined> {
  let queryStr = `
    select role_id, role_name, created_at, modified_at from user_role ur
      where ur.role_name like $1
      limit 1
  `;
  let queryRes = await PgClient.query(queryStr, [ roleName ]);
  if(queryRes.rows.length < 1) {
    return;
  }
  return UserRoleDtoSchema.decode(queryRes.rows[0]);
}
