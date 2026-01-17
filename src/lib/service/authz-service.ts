
/*
AuthZ / Role / Permission service
  Used to determine whether users have access to resources
_*/

import { authzRepo } from '../db/authz-repo';
import { PgClient } from '../db/pg-client';
import { PermissionDto } from '../models/authz/permission-dto';
import { PermissionResp, RoleResp } from '../models/authz/role-resp';
import { UserRoleDto } from '../models/authz/user-role-dto';

type GetRolesOpts = {
  withPermissions?: boolean;
} & {};

export const authzService = {
  getRolePermissions: getRolePermissions,
  getRoles: getRoles,
  addRoleToUser: addRoleToUser,
  removeRoleFromUser: removeRoleFromUser,
  checkPermission: checkPermission,
  getUserPermissions: getUserPermissions,
} as const;

async function getRolePermissions(roleId: UserRoleDto['role_id']): Promise<PermissionDto[]> {
  return authzRepo.getRolePermissions(PgClient, roleId);
}

async function checkPermission(userId: string, permission: string): Promise<boolean> {
  let permissionDtos = await authzRepo.getUserPermissions(PgClient, userId);
  let foundPermission: PermissionDto | undefined = permissionDtos.find(permissionDto => {
    return permissionDto.permission_name === permission;
  });
  return foundPermission !== undefined;
}

async function getUserPermissions(userId: string): Promise<PermissionResp[]> {
  let permissionDtos = await authzRepo.getUserPermissions(PgClient, userId);
  let permissions: PermissionResp[] = permissionDtos.map(permissionDto => {
    return {
      id: permissionDto.permission_id,
      name: permissionDto.permission_name,
    };
  });
  return permissions;
}

async function getRoles(userId: string, opts?: GetRolesOpts): Promise<RoleResp[]> {
  let roleDtos = await authzRepo.getUserRoles(PgClient, userId);
  let roles: RoleResp[] = roleDtos.map((roleDto) => {
    return {
      id: roleDto.role_id,
      name: roleDto.role_name,
    };
  });
  if(opts?.withPermissions === true) {
    for(let i = 0; i < roles.length; i++) {
      let role = roles[i];
      let permissionDtos = await authzRepo.getRolePermissions(PgClient, role.id);
      let permissions: PermissionResp[] = permissionDtos.map((permissionDto) => {
        return {
          id: permissionDto.permission_id,
          name: permissionDto.permission_name,
        };
      });
      role.permissions = permissions;
    }
  }
  return roles;
}

async function addRoleToUser(userId: string, roleName: string) {
  let roleDto = await authzRepo.getRoleByName(PgClient, roleName);
  await authzRepo.insertUsersUserRole(PgClient, userId, roleDto.role_id);
}
async function removeRoleFromUser(userId: string, roleName: string) {
  let roleDto = await authzRepo.getRoleByName(PgClient, roleName);
  await authzRepo.deleteUsersUserRole(PgClient, userId, roleDto.role_id);
}
