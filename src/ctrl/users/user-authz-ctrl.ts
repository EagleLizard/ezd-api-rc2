
import { Type } from 'typebox';
import { EzdError } from '../../lib/models/error/ezd-error';
import { authzService } from '../../lib/service/authz-service';
import { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { PermissionRespSchema, RoleRespSchema } from '../../lib/models/authz/role-resp';

const GetUserRolesSchema = {
  params: Type.Object({
    userId: Type.String(),
  }),
  response: {
    200: Type.Array(RoleRespSchema.schema),
  }
} as const;
type GetUserRoles = typeof GetUserRolesSchema;

async function getUserRoles(
  req: ReqTB<GetUserRoles>,
  res: RepTB<GetUserRoles>
) {
  if(req.ctx.user?.user_id === undefined) {
    throw new EzdError('user_id missing from request context', 'EZD_2.1');
  }
  let userRoles = await authzService.getUserRoles(req.params.userId);
  return res.status(200).send(userRoles);
}

const PostUserRoleSchema = {
  params: Type.Object({
    userId: Type.String(),
  }),
  body: Type.Object({
    roles: Type.Array(Type.String())
  }),
  response: {
    200: Type.Optional(Type.Object({})),
    403: Type.Optional(Type.Object({})),
  }
} as const;
type PostUserRole = typeof PostUserRoleSchema;

async function postUserRole(
  req: ReqTB<PostUserRole>,
  res: RepTB<PostUserRole>
) {
  /*
    Assign a role to a user. Requires user management permission.
  _*/
  let ctxUser = req.ctx.getUser();
  let canAssignRole = await authzService.checkPermission(ctxUser.user_id, 'user.mgmt');
  if(!canAssignRole) {
    return res.status(403).send();
  }
  for(let i = 0; i < req.body.roles.length; i++) {
    let roleName = req.body.roles[i];
    await authzService.addRoleToUser(req.params.userId, roleName);
  }
  return res.status(200).send();
}

const DeleteUserRoleSchema = {
  params: Type.Object({
    userId: Type.String(),
    roleName: Type.String(),
  }),
} as const;
type DeleteUserRole = typeof DeleteUserRoleSchema;

async function deleteUserRole(
  req: ReqTB<DeleteUserRole>,
  res: RepTB<DeleteUserRole>
) {
  let ctxUser = req.ctx.getUser();
  let canDeleteRole = await authzService.checkPermission(ctxUser.user_id, 'user.mgmt');
  if(!canDeleteRole) {
    return res.status(403).send();
  }
  await authzService.removeRoleFromUser(req.params.userId, req.params.roleName);
  return res.status(200).send();
}

const GetUserPermissionsSchema = {
  params: Type.Object({
    userId: Type.String(),
  }),
  response: {
    200: Type.Array(PermissionRespSchema.schema),
  },
} as const;
type GetUserPermissions = typeof GetUserPermissionsSchema;

async function getUserPermissions(
  req: ReqTB<GetUserPermissions>,
  res: RepTB<GetUserPermissions>
) {
  if(req.ctx.user === undefined) {
    throw new EzdError('user_id missing from request context', 'EZD_2.1');
  }
  let userPermissions = await authzService.getUserPermissions(req.params.userId);
  return res.status(200).send(userPermissions);
}

export const userAuthzCtrl = {
  GetUserRolesSchema: GetUserRolesSchema,
  PostUserRoleSchema: PostUserRoleSchema,
  DeleteUserRoleSchema: DeleteUserRoleSchema,
  GetUserPermissionsSchema: GetUserPermissionsSchema,

  getUserRoles: getUserRoles,
  postUserRole: postUserRole,
  deleteUserRole: deleteUserRole,
  getUserPermissions: getUserPermissions,
} as const;
