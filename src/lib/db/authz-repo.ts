import { PermissionDto, PermissionDtoSchema } from '../models/authz/permission-dto';
import { UserRoleDto, UserRoleDtoSchema } from '../models/authz/user-role-dto';
import { EzdError } from '../models/error/ezd-error';
import { IPgClient } from './pg-client';

export const authzRepo = {
  getUserRoles: getUserRoles,
  insertUserRole: insertUserRole,
  getRoleByName: getRoleByName,
  insertUsersUserRole: insertUsersUserRole,
  deleteUsersUserRole: deleteUsersUserRole,
  getUserPermissions: getUserPermissions,
  getRolePermissions: getRolePermissions,
  insertRolePermission: insertRolePermission,
  insertPermission: insertPermission,
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
