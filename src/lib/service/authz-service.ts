
/*
AuthZ / Role / Permission service
  Used to determine whether users have access to resources
_*/

import { authzRepo } from '../db/authz-repo';
import { PgClient } from '../db/pg-client';
import { PermissionDto } from '../models/authz/permission-dto';
import { PermissionResp, RoleResp } from '../models/authz/role-resp';
import { UserRoleDto } from '../models/authz/user-role-dto';
import { EzdError } from '../models/error/ezd-error';
import { ezdErrorCodes } from '../models/error/ezd-error-codes';

type GetRolesOpts = {
  withPermissions?: boolean;
} & {};

export const authzService = {
  getRolePermissions: getRolePermissions,
  getRoles: getRoles,
  createRole: createRole,
  deleteRole: deleteRole,
  getRoleByName: getRoleByName,
  getUserRoles: getUserRoles,
  addRoleToUser: addRoleToUser,
  removeRoleFromUser: removeRoleFromUser,
  getPermissions: getPermissions,
  checkPermission: checkPermission,
  getUserPermissions: getUserPermissions,
  createPermissionWithRole: createPermissionWithRole,
} as const;

async function getRolePermissions(roleId: UserRoleDto['role_id']): Promise<PermissionDto[]> {
  return authzRepo.getRolePermissions(PgClient, roleId);
}

async function getPermissions(asUserId: string): Promise<PermissionResp[]> {
  let canReadPerms = await authzService.checkPermission(asUserId, 'permission.read');
  if(!canReadPerms) {
    throw new EzdError(`Error reading permissions as userId ${
      asUserId
    }: permission denied`, 'EZD_5.2');
  }
  let permissionDtos = await authzRepo.getPermissions(PgClient);
  let perms: PermissionResp[] = permissionDtos.map((permissionDto) => {
    return {
      id: permissionDto.permission_id,
      name: permissionDto.permission_name,
    };
  });
  return perms;
}

async function checkPermission(userId: string, permission: string): Promise<boolean> {
  let permissionDtos = await authzRepo.getUserPermissions(PgClient, userId);
  let foundPermission: PermissionDto | undefined = permissionDtos.find(permissionDto => {
    return permissionDto.permission_name === permission;
  });
  return foundPermission !== undefined;
}

async function createPermissionWithRole(
  roleName: string,
  permissionName: string
): Promise<PermissionDto> {
  let permission: PermissionDto | undefined;
  let txnClient = await PgClient.initClient();
  try {
    let role = await authzRepo.getRoleByName(txnClient, roleName);
    permission = await authzRepo.getPermissionByName(txnClient, permissionName);
    if(permission === undefined) {
      permission = await authzRepo.insertPermission(txnClient, permissionName);
    }
    await authzRepo.insertRolePermission(txnClient, role.role_id, permission.permission_id);
    await txnClient.query('COMMIT');
  } catch(e) {
    await txnClient.query('ROLLBACK');
    throw e;
  } finally {
    txnClient.release();
  }
  return permission;
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

async function createRole(asUserId: string, name: string): Promise<UserRoleDto> {
  // check permission
  let canCreateRole = await authzService.checkPermission(asUserId, 'role.create');
  if(!canCreateRole) {
    throw new EzdError(`Error creating role '${
      name
    }' as userId ${asUserId}: permission denied`, 'EZD_5.0');
  }
  let role: UserRoleDto;
  try {
    role = await authzRepo.getRoleByName(PgClient, name);
    return role;
  } catch(e) {
    if(!(e instanceof EzdError) || (e.code !== ezdErrorCodes.db_role_not_found)) {
      throw e;
    }
  }
  role = await authzRepo.insertUserRole(PgClient, name);
  return role;
}

async function deleteRole(asUserId: string, roleId: UserRoleDto['role_id']): Promise<void> {
  let canDeleteRole = await authzService.checkPermission(asUserId, 'role.delete');
  if(!canDeleteRole) {
    throw new EzdError(`Error deleting roleId ${roleId} as userId ${
      asUserId
    }: permission denied`, 'EZD_5.3');
  }
  await authzRepo.deleteUserRole(PgClient, roleId);
}

async function getRoleByName(
  asUserId: string,
  roleName: string,
  opts: GetRolesOpts = {}
): Promise<RoleResp> {
  let canReadRoles = await authzService.checkPermission(asUserId, 'role.read');
  let canReadPerms = false;
  let roleDto: UserRoleDto;
  let permDtos: PermissionDto[];
  if(!canReadRoles) {
    throw new EzdError(`Error getting role '${roleName}' as userId ${
      asUserId
    }: permission denied`, 'EZD_5.1');
  }
  if(opts.withPermissions) {
    canReadPerms = await authzService.checkPermission(asUserId, 'permission.read');
    if(!canReadPerms) {
      throw new EzdError(`Error reading permissions as userId ${
        asUserId
      }: permission denied`, 'EZD_5.2');
    }
    [ roleDto, permDtos ] = await authzRepo.getRoleWithPermissionsByName(PgClient, roleName);
    let permResps: PermissionResp[] = permDtos.map((permDto) => {
      return {
        id: permDto.permission_id,
        name: permDto.permission_name,
      };
    });
    let roleResp: RoleResp = {
      id: roleDto.role_id,
      name: roleDto.role_name,
      permissions: permResps,
    };
    return roleResp;
  }
  roleDto = await authzRepo.getRoleByName(PgClient, roleName);
  let roleResp: RoleResp = {
    id: roleDto.role_id,
    name: roleDto.role_name,
  };
  return roleResp;
}

async function getRoles(asUserId: string, opts: GetRolesOpts = {}): Promise<RoleResp[]> {
  let canReadRoles = await authzService.checkPermission(asUserId, 'role.read');
  let canReadPerms: boolean = false;
  let roleDtos: UserRoleDto[];
  if(!canReadRoles) {
    throw new EzdError(`Error reading roles as userId ${asUserId}: permission denied`, 'EZD_5.1');
  }
  if(opts.withPermissions) {
    canReadPerms = await authzService.checkPermission(asUserId, 'permission.read');
    if(!canReadPerms) {
      throw new EzdError(`Error reading permissions as userId ${
        asUserId
      }: permission denied`, 'EZD_5.2');
    }
    let rolePermTuples = await authzRepo.getRolesWithPermissions(PgClient);
    let roleResps: RoleResp[] = [];
    for(let i = 0; i < rolePermTuples.length; i++) {
      let [ roleDto, permissionDtos ] = rolePermTuples[i];
      let permResps: PermissionResp[] = permissionDtos.map(permDto => {
        return {
          id: permDto.permission_id,
          name: permDto.permission_name,
        };
      });
      roleResps.push({
        id: roleDto.role_id,
        name: roleDto.role_name,
        permissions: permResps,
      });
    }
    return roleResps;
  }
  roleDtos = await authzRepo.getRoles(PgClient);
  let roleResps: RoleResp[] = roleDtos.map(roleDto => {
    return {
      id: roleDto.role_id,
      name: roleDto.role_name,
    };
  });
  return roleResps;
}

async function getUserRoles(userId: string, opts?: GetRolesOpts): Promise<RoleResp[]> {
  let roleDtos = await authzRepo.getUserRoles(PgClient, userId);
  let roles: RoleResp[] = roleDtos.map((roleDto) => {
    return {
      id: roleDto.role_id,
      name: roleDto.role_name,
    };
  });
  if(opts?.withPermissions) {
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
