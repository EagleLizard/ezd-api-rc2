
import { Type } from 'typebox';

import {
  FastifyReplyTypeBox,
  FastifyRequestTypeBox
} from '../../lib/models/fastify/fastify-typebox';
import { UserDto, UserDtoSchema } from '../../lib/models/user-dto';
import { userService } from '../../lib/service/user-service';
import {
  PermissionResp,
  PermissionRespSchema,
  RoleResp,
  RoleRespSchema
} from '../../lib/models/authz/role-resp';
import { authzService } from '../../lib/service/authz-service';
import { UserInfo, UserInfoSchema } from '../../lib/models/user-info';

const GetUsersSchema = {
  querystring: Type.Object({
    name: Type.String(),
  }),
  response: {
    200: Type.Object({
      user: UserInfoSchema,
      roles: Type.Optional(Type.Array(RoleRespSchema)),
      permissions: Type.Optional(Type.Array(PermissionRespSchema))
    }),
    401: Type.Optional(Type.Object({})),
    404: Type.Optional(Type.String()),
  }
} as const;
type GetUsers = typeof GetUsersSchema;

async function getUsers(
  req: FastifyRequestTypeBox<GetUsers>,
  res: FastifyReplyTypeBox<GetUsers>
) {
  let user: UserDto | undefined;
  let username: string;
  let ctxUser = req.ctx.getUser();
  username = req.query.name;
  user = await userService.getUserByName(username);
  if(user === undefined) {
    return res.status(404).send('404 - User not found');
  }
  let permissions: PermissionResp[] | undefined;
  let roles: RoleResp[] | undefined;
  let includePermissions = (ctxUser.user_id === user.user_id)
    || await authzService.checkPermission(ctxUser.user_id, 'user.mgmt')
  ;
  let includeRoles = (ctxUser.user_id === user.user_id)
    || await authzService.checkPermission(ctxUser.user_id, 'user.mgmt')
  ;
  if(includePermissions) {
    permissions = await authzService.getUserPermissions(user.user_id);
  }
  if(includeRoles) {
    roles = await authzService.getRoles(user.user_id);
  }
  /*
    Default) respond with basic user info
      - TODO: may want logic here to return more detailed user info for
        users with certain administrative privileges
  _*/
  let userInfo: UserInfo;
  userInfo = user;
  await res.status(200).send({
    user: userInfo,
    permissions: permissions,
    roles: roles,
  });
}

const DeleteUserSchema = {
  params: Type.Object({
    userId: Type.String(),
  }),
  response: {
    200: Type.Optional(Type.Object({})),
    401: Type.Optional(Type.Object({})),
    403: Type.Optional(Type.Object({})),
    404: Type.Optional(Type.Object({})),
  },
} as const;
type DeleteUser = typeof DeleteUserSchema;

async function deleteUser(
  req: FastifyRequestTypeBox<DeleteUser>,
  res: FastifyReplyTypeBox<DeleteUser>,
) {
  if(req.ctx.user === undefined) {
    return res.status(401).send();
  }
  let canDeleteUser = await authzService.checkPermission(req.ctx.user.user_id, 'user.mgmt');
  if(!canDeleteUser) {
    return res.status(403).send();
  }
  let userToDelete = await userService.getUserById(req.params.userId);
  if(userToDelete === undefined) {
    return res.status(404).send();
  }
  await userService.deleteUser(req.params.userId);
  return res.status(200).send();
}

const CreateUser = {
  body: Type.Object({
    userName: Type.String(),
    email: Type.String(),
    password: Type.Optional(Type.String()),
  }),
  response: {
    200: UserDtoSchema.schema,
    403: Type.Optional(Type.Object({})),
  }
} as const;
type CreateUser = typeof CreateUser;

/*
  Similar to register user, but allows privileged users to create new users.
    Facilitates creation of a user without a password.
_*/
async function createUser(
  req: FastifyRequestTypeBox<CreateUser>,
  res: FastifyReplyTypeBox<CreateUser>
) {
  let ctxUser = req.ctx.getUser();
  let canCreateUser = await authzService.checkPermission(ctxUser.user_id, 'user.create');
  if(!canCreateUser) {
    return res.status(403).send();
  }
  let username = req.body.userName;
  let email = req.body.email;
  let pw = req.body.password;
  let newUser = await userService.createUser(username, email, pw);
  return res.status(200).send(newUser);
}

export const userCtrl = {
  CreateUser: CreateUser,
  GetUsersSchema: GetUsersSchema,
  DeleteUserSchema: DeleteUserSchema,

  createUser: createUser,
  getUsers: getUsers,
  deleteUser: deleteUser,
} as const;
