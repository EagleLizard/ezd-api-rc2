
import { Type } from 'typebox';
import { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { authzService } from '../../lib/service/authz-service';
import { EzdError } from '../../lib/models/error/ezd-error';
import {
  PermissionResp,
  PermissionRespSchema,
  RoleRespSchema
} from '../../lib/models/authz/role-resp';
import { UserRoleDto, UserRoleDtoSchema } from '../../lib/models/authz/user-role-dto';

const GetRoles = {
  querystring: Type.Object({
    name: Type.Optional(Type.String()),
    permissions: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: Type.Union([ Type.Array(RoleRespSchema.schema), RoleRespSchema.schema ]),
    403: Type.Optional(Type.Object({})),
  }
} as const;
type GetRoles = typeof GetRoles;
async function getRoles(
  req: ReqTB<GetRoles>,
  res: RepTB<GetRoles>
) {
  let ctxUser = req.ctx.getUser();
  let withPermissions = req.query.permissions === true;
  let roleName = req.query.name;
  try {
    if(roleName !== undefined) {
      let role = await authzService.getRoleByName(ctxUser.user_id, roleName, {
        withPermissions,
      });
      return res.status(200).send(role);
    }
    let roles = await authzService.getRoles(ctxUser.user_id, {
      withPermissions,
    });
    return res.status(200).send(roles);
  } catch(e) {
    if(!(e instanceof EzdError) || (e.code !== 'EZD_5.1' && e.code !== 'EZD_5.2')) {
      throw e;
    }
    return res.status(403).send();
  }
}

const CreateRole = {
  body: Type.Object({
    name: Type.String(),
  }),
  response: {
    200: UserRoleDtoSchema.schema,
    403: Type.Optional(Type.Object({})),
  },
} as const;
type CreateRole = typeof CreateRole;
async function createRole(
  req: ReqTB<CreateRole>,
  res: RepTB<CreateRole>
) {
  let ctxUser = req.ctx.getUser();
  let roleDto: UserRoleDto;
  try {
    roleDto = await authzService.createRole(ctxUser.user_id, req.body.name);
    return res.status(200).send(roleDto);
  } catch(e) {
    if(e instanceof EzdError && e.code === 'EZD_5.0') {
      return res.status(403).send();
    }
    throw e;
  }
}

const DeleteRole = {
  params: Type.Object({
    roleId: UserRoleDtoSchema.schema.properties.role_id,
  }),
  response: {
    200: Type.Optional(Type.Object({})),
    403: Type.Optional(Type.Object({})),
  },
} as const;
type DeleteRole = typeof DeleteRole;
async function deleteRole(
  req: ReqTB<DeleteRole>,
  res: RepTB<DeleteRole>,
) {
  let ctxUser = req.ctx.getUser();
  try {
    await authzService.deleteRole(ctxUser.user_id, req.params.roleId);
    return res.status(200).send();
  } catch(e) {
    if(e instanceof EzdError && e.code === 'EZD_5.3') {
      return res.status(403).send();
    }
    throw e;
  }
}

const GetPermissions = {
  response: {
    200: Type.Array(PermissionRespSchema.schema),
    403: Type.Optional(Type.Object({})),
  },
} as const;
type GetPermissions = typeof GetPermissions;
async function getPermissions(
  req: ReqTB<GetPermissions>,
  res: RepTB<GetPermissions>
) {
  let ctxUser = req.ctx.getUser();
  let permissions: PermissionResp[];
  try {
    permissions = await authzService.getPermissions(ctxUser.user_id);
    return res.status(200).send(permissions);
  } catch(e) {
    if(e instanceof EzdError && e.code === 'EZD_5.2') {
      return res.status(403).send();
    }
    throw e;
  }
}
export const authzCtrl = new class AuthZCtrl {
  GetRoles = GetRoles;
  CreateRole = CreateRole;
  DeleteRole = DeleteRole;
  GetPermissions = GetPermissions;
  getRoles = getRoles;
  createRole = createRole;
  deleteRole = deleteRole;
  getPermissions = getPermissions;
};
