
import Type, { Static } from 'typebox';
import { userService } from '../../lib/service/user-service';
import { UserDto, UserDtoSchema } from '../../lib/models/user-dto';
import { EzdError } from '../../lib/models/error/ezd-error';
import {
  FastifyReplyTypeBox,
  FastifyRequestTypeBox
} from '../../lib/models/fastify/fastify-typebox';
import { authService } from '../../lib/service/auth-service';
import { RegisterUserBody, RegisterUserBodySchema } from '../../lib/models/register-user-body';
import { ValidationError } from '../../lib/models/error/validation-error';

const PostRegisterUserSchema = {
  body: Type.Object({
    userName: Type.String(),
    email: Type.String(),
    password: Type.String(),
  }),
  response: {
    200: Type.Object({
      user: UserDtoSchema.schema,
    }),
    403: Type.Optional(Type.Object({
      errMsg: Type.String(),
    })),
  },
} as const;
type PostRegisterUser = typeof PostRegisterUserSchema;

async function postRegisterUser(
  req: FastifyRequestTypeBox<PostRegisterUser>,
  res: FastifyReplyTypeBox<PostRegisterUser>,
) {
  let body: RegisterUserBody;
  if(!RegisterUserBodySchema.check(req.body)) {
    return res.status(403).send();
  }
  body = RegisterUserBodySchema.decode(req.body);
  let registerUserRes = await userService.registerUser(body);
  if(registerUserRes instanceof Error) {
    let errMsg: string;
    errMsg = 'Error creating user';
    if(registerUserRes instanceof ValidationError) {
      errMsg = registerUserRes.message;
    }
    req.log.info(errMsg);
    return res.status(403).send({
      errMsg,
    });
  }
  console.log('after registerUser');
  return res.status(200).send({
    user: registerUserRes,
  });
}

const PostUserLoginSchema = {
  body: Type.Object({
    userName: Type.String(),
    password: Type.String(),
  }),
  querystring: Type.Object({
    withJwt: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: Type.Object({
      user: UserDtoSchema.schema,
      token: Type.Optional(Type.String()),
    }),
    401: Type.Optional(Type.Object({
      code: Type.Optional(Type.String()),
      message: Type.Optional(Type.String()),
    }))
  },
} as const;
type PostUserLogin = typeof PostUserLoginSchema;

async function postUserLogin(
  req: FastifyRequestTypeBox<PostUserLogin>,
  res: FastifyReplyTypeBox<PostUserLogin>
) {
  let user: UserDto | Error | undefined;
  let respOk: Static<PostUserLogin['response'][200]>;
  /*
  TODO: check login attempts
  _*/
  user = await userService.checkUserPassword(req.body.userName, req.body.password);
  if(user instanceof Error) {
    let err = user;
    req.log.info(err.message);
    if(err instanceof EzdError) {
      res.status(401).send({
        code: err.code,
        message: err.ezdMsg,
      });
    } else {
      res.status(401);
    }
    return res;
  }
  if(user === undefined) {
    /* invalid password _*/
    return res.status(401).send();
  }
  await userService.logInUser(user, req.session, req.ip);

  respOk = {
    user: user,
  };
  if(req.query.withJwt === true) {
    respOk.token = await authService.getJwt(user);
  }

  res.setCookie('ezd_user', user.user_name);
  return res.status(200).send(respOk);
}

const PostUserLogoutSchema = {
  response: {
    200: Type.Object({
      user: UserDtoSchema.schema,
    }),
    401: Type.Object({
      code: Type.Optional(Type.String()),
      message: Type.Optional(Type.String()),
    }),
  },
} as const;
type PostUserLogout = typeof PostUserLogoutSchema;

async function postUserLogout(
  req: FastifyRequestTypeBox<PostUserLogout>,
  res: FastifyReplyTypeBox<PostUserLogout>,
) {
  let user: UserDto | undefined;
  user = req.ctx.user;
  if(user === undefined) {
    return res.status(401).send();
  }
  await userService.logoutUser(req.session.sessionId, user);
  return res.status(200).send();
}

const DeleteUserSchema = {
  params: Type.Object({
    userId: Type.String(),
  }),
  response: {
    200: Type.Optional(Type.Object({})),
  },
} as const;
type DeleteUser = typeof DeleteUserSchema;
async function deleteUser(
  req: FastifyRequestTypeBox<DeleteUser>,
  res: FastifyReplyTypeBox<DeleteUser>,
) {
  await userService.deleteUser(req.params.userId);
  return res.status(200).send();
}

/*
  Exports
_*/
export const userAuthCtrl = {
  DeleteUserSchema: DeleteUserSchema,
  PostRegisterUserSchema: PostRegisterUserSchema,
  PostUserLoginSchema: PostUserLoginSchema,
  PostUserLogoutSchema: PostUserLogoutSchema,

  deleteUser: deleteUser,
  postRegisterUser: postRegisterUser,
  postUserLogin: postUserLogin,
  postUserLogout: postUserLogout,
} as const;
