
import crypto from 'node:crypto';

import { IPgClient, PgClient } from './pg-client';
import { PasswordDto, PasswordDtoSchema } from '../models/password-dto';
import { UserDto, UserDtoSchema } from '../models/user-dto';
import { authUtil } from '../lib/auth-util';
import { EzdError } from '../models/error/ezd-error';
import { idGen } from '../lib/id-gen';
import { authzRepo } from './authz-repo';
import { GetUserRespItem } from '../models/user/get-user-resp';
import { prim } from '../../util/validate-primitives';
import { UserInfoSchema } from '../models/user-info';
import {
  PermissionResp,
  PermissionRespSchema,
  RoleResp,
  RoleRespSchema,
} from '../models/authz/role-resp';
import { MapVal } from '../../util/type-util';

export const userRepo = {
  getUsers: getUsers,
  insertUser: insertUser,
  createUser: createUser,
  deleteUser: deleteUser,
  getUserById: getUserById,
  getUserByName: getUserByName,
  getUsersWithAuthz: getUsersWithAuthz,
  getUserWithAuthzByName: getUserWithAuthzByName,
  getPasswordByUserId: getPasswordByUserId,
  insertPassword: insertPassword,
} as const;

async function getUsers(pgClient: IPgClient): Promise<UserDto[]> {
  let queryRes = await pgClient.query(`
    select * from users u
    order by u.created_at desc
  `);
  let users = queryRes.rows.map(UserDtoSchema.decode);
  return users;
}

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
  if(queryRes.rows.length < 1) {
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

export type GetUserWithAuthzOpts = {
  withRoles?: boolean;
  withPermissions?: boolean;
} & {};
async function getUserWithAuthzByName(
  pgClient: IPgClient,
  name: string,
  opts: GetUserWithAuthzOpts = {}
): Promise<GetUserRespItem | undefined> {
  let getUsersOpts = Object.assign({
    username: name,
  }, opts);
  let getUsersRes = await getUsersWithAuthz(pgClient, getUsersOpts);
  return getUsersRes[0];
}

type GetUsersWithAuthzOpts = GetUserWithAuthzOpts & {
  username?: string;
} & {};
async function getUsersWithAuthz(
  pgClient: IPgClient,
  opts: GetUsersWithAuthzOpts = {}
): Promise<GetUserRespItem[]> {
  let queryStr = `
    select u.*, p.permission_id, p.permission_name, ur.role_id, ur.role_name from users u
      inner join users_user_role uur on uur.user_id = u.user_id
      inner join user_role ur on ur.role_id = uur.role_id
      left join role_permission rp on rp.role_id = ur.role_id
      left join permission p on p.permission_id = rp.permission_id
  `;
  let queryVals: [ username?: string ] = [];
  if(opts.username !== undefined) {
    queryStr = `${queryStr}
      where u.user_name = $1;
    `;
    queryVals = [ opts.username ];
  }
  let queryRes = await pgClient.query(queryStr, queryVals);
  if(!queryRes.rows.every(row => prim.isObject(row))) {
    throw new EzdError('Invalid query result', 'EZD_3.5');
  }
  let respItemMap: Map<GetUserRespItem['user']['user_id'], {
    user: GetUserRespItem['user'],
    permMap: Map<PermissionResp['id'], PermissionResp>,
    roleMap: Map<RoleResp['id'], RoleResp>,
  }> = new Map();
  for(let i = 0; i < queryRes.rows.length; i++) {
    let row = queryRes.rows[i];
    let respItem: MapVal<typeof respItemMap>;
    let user: GetUserRespItem['user'] = UserInfoSchema.decode({
      user_id: row.user_id,
      user_name: row.user_name,
      email: row.user_name,
      created_at: row.created_at,
      modified_at: row.modified_at,
    });
    if(respItemMap.has(user.user_id)) {
      respItem = respItemMap.get(user.user_id)!;
    } else {
      respItem = {
        user: user,
        permMap: new Map(),
        roleMap: new Map(),
      };
      respItemMap.set(user.user_id, respItem);
    }
    if(opts.withPermissions && (row.permission_id !== undefined)) {
      let perm = PermissionRespSchema.decode({
        id: row.permission_id,
        name: row.permission_name,
      });
      if(!respItem.permMap.has(perm.id)) {
        respItem.permMap.set(perm.id, perm);
      }
    }
    if(opts.withRoles && (row.role_id !== undefined)) {
      let role = RoleRespSchema.decode({
        id: row.role_id,
        name: row.role_name,
      });
      if(!respItem.roleMap.has(role.id)) {
        respItem.roleMap.set(role.id, role);
      }
    }
  }
  let respItems: GetUserRespItem[] = [];
  respItemMap.forEach((val) => {
    let respItem: GetUserRespItem = {
      user: val.user,
    };
    if(val.permMap.size > 0) {
      respItem.permissions = [ ...val.permMap.values() ];
    }
    if(val.roleMap.size > 0) {
      respItem.roles = [ ...val.roleMap.values() ];
    }
    respItems.push(respItem);
  });
  return respItems;
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
      let roleDto = await authzRepo.getRoleByName(txnClient, roleName);
      await authzRepo.insertUsersUserRole(txnClient, userDto.user_id, roleDto.role_id);
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
      order by p.created_at desc
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
