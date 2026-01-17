import { PermissionDto, PermissionDtoSchema } from '../models/authz/permission-dto';
import { UserRoleDto, UserRoleDtoSchema } from '../models/authz/user-role-dto';
import { EzdError } from '../models/error/ezd-error';
import { IPgClient } from './pg-client';

export const authzRepo = {
  getUserRoles: getUserRoles,
  getRoleByName: getRoleByName,
  insertUsersUserRole: insertUsersUserRole,
  deleteUsersUserRole: deleteUsersUserRole,
  getUserPermissions: getUserPermissions,
  getRolePermissions: getRolePermissions,
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
