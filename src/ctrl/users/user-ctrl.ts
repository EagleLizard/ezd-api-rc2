
import { Type } from 'typebox';

import { RepTB, ReqTB } from '../../lib/models/fastify/fastify-typebox';
import { UserDtoSchema } from '../../lib/models/user-dto';
import { userService } from '../../lib/service/user-service';
import { authzService } from '../../lib/service/authz-service';
import { GetUserRespItem } from '../../lib/models/user/get-user-resp';

const GetUsersSchema = {
  querystring: Type.Object({
    name: Type.Optional(Type.String()),
    permissions: Type.Optional(Type.Boolean()),
    roles: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: Type.Union([ GetUserRespItem, Type.Array(GetUserRespItem) ]),
    400: Type.Optional(Type.String()),
    401: Type.Optional(Type.Object({})),
  }
} as const;
type GetUsers = typeof GetUsersSchema;

async function getUsers(
  req: ReqTB<GetUsers>,
  res: RepTB<GetUsers>
) {
  let ctxUser = req.ctx.getUser();
  let username = req.query.name;
  if(username !== undefined) {
    /* return specified user if found _*/
    let userWithAUthz = await userService.getGetUserRespByName(ctxUser.user_id, username, {
      withPermissions: req.query.permissions,
      withRoles: req.query.roles,
    });
    if(userWithAUthz === undefined) {
      return res.status(400).send('User not found');
    }
    return res.status(200).send(userWithAUthz);
  }
  /* return list of users _*/
  let users = await userService.getGetUsersResp(ctxUser.user_id, {
    withPermissions: req.query.permissions,
    withRoles: req.query.roles,
  });
  return res.status(200).send(users);
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
  req: ReqTB<DeleteUser>,
  res: RepTB<DeleteUser>,
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
  req: ReqTB<CreateUser>,
  res: RepTB<CreateUser>
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
