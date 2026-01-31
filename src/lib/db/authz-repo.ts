
import { prim } from '../../util/validate-primitives';
import { PermissionDto, PermissionDtoSchema } from '../models/authz/permission-dto';
import { UserRoleDto, UserRoleDtoSchema } from '../models/authz/user-role-dto';
import { EzdError } from '../models/error/ezd-error';
import { IPgClient } from './pg-client';

export const authzRepo = {
  getRoles: getRoles,
  getRoleWithPermissionsByName: getRoleWithPermissionsByName,
  getRolesWithPermissions: getRolesWithPermissions,
  getUserRoles: getUserRoles,
  insertUserRole: insertUserRole,
  deleteUserRole: deleteUserRole,
  getRoleByName: getRoleByName,
  insertUsersUserRole: insertUsersUserRole,
  deleteUsersUserRole: deleteUsersUserRole,
  getUserPermissions: getUserPermissions,
  getRolePermissions: getRolePermissions,
  insertRolePermission: insertRolePermission,
  insertPermission: insertPermission,
  getPermissions: getPermissions,
  getPermissionByName: getPermissionByName,
} as const;

async function getRolePermissions(
  pgClient: IPgClient,
  roleId: number
): Promise<PermissionDto[]> {
  let queryStr = `
    select p.* from permission p
      INNER JOIN role_permission rp ON p.permission_id = rp.permission_id
    where rp.role_id = $1
  `;
  let queryRes = await pgClient.query(queryStr, [ roleId ]);
  let permissionDtos = queryRes.rows.map(PermissionDtoSchema.decode);
  return permissionDtos;
}

async function insertRolePermission(
  pgClient: IPgClient,
  roleId: number,
  permissionId: number
): Promise<void> {
  let queryStr = `
    insert into role_permission (role_id, permission_id) values($1,$2)
      ON CONFLICT DO NOTHING
    returning *
  `;
  let queryRes = await pgClient.query(queryStr, [ roleId, permissionId ]);
  if(queryRes.rows.length < 1) {
    return;
  }
}

async function getRoles(pgClient: IPgClient): Promise<UserRoleDto[]> {
  let queryRes = await pgClient.query(`
    select ur.* from user_role ur
    order by ur.created_at desc
  `);
  let roles = queryRes.rows.map(UserRoleDtoSchema.decode);
  return roles;
}

async function getRoleWithPermissionsByName(
  pgClient: IPgClient,
  role_name: string,
): Promise<[UserRoleDto, PermissionDto[]]> {
  let getRolesResp = await getRolesWithPermissions(pgClient, { role_name });
  return getRolesResp[0];
}

async function getRolesWithPermissions(
  pgClient: IPgClient,
  opts: {
    role_name?: string
  } = {}
): Promise<[UserRoleDto, PermissionDto[]][]> {
  let queryVals: [ role_name?: string ] = [];
  let queryStr = `
    select ur.*, p.permission_id, p.permission_name from user_role ur
      left join role_permission rp on rp.role_id = ur.role_id
      left join permission p on p.permission_id = rp.permission_id
  `;
  if(opts.role_name !== undefined) {
    queryStr = `${queryStr}
      where ur.role_name = $1
    `;
    queryVals = [ opts.role_name ];
  }
  let queryRes = await pgClient.query(queryStr, queryVals);
  if(!queryRes.rows.every(prim.isObject)) {
    throw new EzdError('Invalid query result', 'EZD_3.5');
  }
  let rolePermTupleMap: Map<
    UserRoleDto['role_id'],
    [UserRoleDto, Map<PermissionDto['permission_id'], PermissionDto>]
  > = new Map();
  for(let i = 0; i < queryRes.rows.length; i++) {
    let row = queryRes.rows[i];
    let roleDto = UserRoleDtoSchema.decode({
      role_id: row.role_id,
      role_name: row.role_name,
      created_at: row.created_at,
      modified_at: row.modified_at,
    });
    let rolePermTuple = rolePermTupleMap.get(roleDto.role_id);
    if(rolePermTuple === undefined) {
      rolePermTuple = [ roleDto, new Map() ];
      rolePermTupleMap.set(roleDto.role_id, rolePermTuple);
    }
    if(row.permission_id !== null) {
      let permMap = rolePermTuple[1];
      let permDto = PermissionDtoSchema.decode({
        permission_id: row.permission_id,
        permission_name: row.permission_name,
        created_at: row.created_at,
        modified_at: row.modified_at,
      });
      if(!permMap.has(permDto.permission_id)) {
        permMap.set(permDto.permission_id, permDto);
      }
    }
  }
  let resTuples: [UserRoleDto, PermissionDto[]][] = [];
  rolePermTupleMap.values().forEach(rolePermTuple => {
    let [ roleDto, permMap ] = rolePermTuple;
    resTuples.push([ roleDto, [ ...permMap.values() ]]);
  });
  return resTuples;
}

async function getUserRoles(pgClient: IPgClient, userId: string): Promise<UserRoleDto[]> {
  let queryStr = `
    select ur.* from user_role ur
      INNER JOIN users_user_role uur ON ur.role_id = uur.role_id
    where uur.user_id = $1
  `;
  let queryRes = await pgClient.query(queryStr, [ userId ]);
  let userRoles: UserRoleDto[] = [];
  for(let i = 0; i < queryRes.rows.length; i++) {
    let userRole = UserRoleDtoSchema.decode(queryRes.rows[i]);
    userRoles.push(userRole);
  }
  return userRoles;
}

async function insertUserRole(pgClient: IPgClient, name: string): Promise<UserRoleDto> {
  let queryStr = `
    insert into user_role (role_name) values($1)
    returning *
  `;
  let queryRes = await pgClient.query(queryStr, [ name ]);
  let roleDto = UserRoleDtoSchema.decode(queryRes.rows[0]);
  return roleDto;
}

async function deleteUserRole(pgClient: IPgClient, roleId: UserRoleDto['role_id']): Promise<void> {
  await pgClient.query(`
    delete from user_role ur
      where ur.role_id = $1
  `, [ roleId ]);
}

async function getRoleByName(
  pgClient: IPgClient,
  roleName: string
): Promise<UserRoleDto> {
  let queryStr = `
    select ur.* from user_role ur
      where ur.role_name = $1
    limit 1
  `;
  let queryRes = await pgClient.query(queryStr, [ roleName ]);
  if(queryRes.rows.length < 1) {
    throw new EzdError(`Role '${roleName}' not found`, 'EZD_3.3');
  }
  return UserRoleDtoSchema.decode(queryRes.rows[0]);
}

async function insertUsersUserRole(pgClient: IPgClient, userId: string, roleId: number) {
  let queryStr = `
    insert into users_user_role (user_id, role_id) values ($1, $2)
      ON CONFLICT DO NOTHING
    returning *
  `;
  await pgClient.query(queryStr, [ userId, roleId ]);
}
async function deleteUsersUserRole(pgClient: IPgClient, userId: string, roleId: number) {
  let queryStr = `
    delete from users_user_role  uur
      where uur.user_id = $1
        and uur.role_id = $2
  `;
  await pgClient.query(queryStr, [ userId, roleId ]);
}

async function getUserPermissions(pgClient: IPgClient, userId: string): Promise<PermissionDto[]> {
  let queryStr = `
    select p.* from permission p
      INNER JOIN role_permission rp ON p.permission_id = rp.permission_id
      INNER JOIN user_role ur ON rp.role_id = ur.role_id
      INNER JOIN users_user_role uur ON uur.role_id = ur.role_id
    where uur.user_id = $1
  `;
  let queryRes = await pgClient.query(queryStr, [ userId ]);
  let permissionDtos = queryRes.rows.map(PermissionDtoSchema.decode);
  return permissionDtos;
}

async function insertPermission(pgClient: IPgClient, name: string): Promise<PermissionDto> {
  let queryStr = `
    insert into permission (permission_name) values($1)
    returning *
  `;
  let queryRes = await pgClient.query(queryStr, [ name ]);
  let permissionDto = PermissionDtoSchema.decode(queryRes.rows[0]);
  return permissionDto;
}

async function getPermissions(pgClient: IPgClient): Promise<PermissionDto[]> {
  let queryRes = await pgClient.query(`
    select p.* from permission p
  `);
  let permissionDtos = queryRes.rows.map(PermissionDtoSchema.decode);
  return permissionDtos;
}

async function getPermissionByName(
  pgClient: IPgClient,
  name: string
): Promise<PermissionDto | undefined> {
  let queryStr = `
    select p.* from permission p
      where p.permission_name = $1
    limit 1
  `;
  let queryRes = await pgClient.query(queryStr, [ name ]);
  if(queryRes.rows.length < 1) {
    return undefined;
  }
  return PermissionDtoSchema.decode(queryRes.rows[0]);
}
