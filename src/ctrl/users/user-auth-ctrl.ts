
import { Type, Static } from 'typebox';
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
import { authzService } from '../../lib/service/authz-service';
import { inputFormats } from '../../util/input-formats';
import { InvalidPasswordError } from '../../lib/models/error/invalid-password-error';

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

  respOk = { user: user };
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

const PostChangePw = {
  body: Type.Object({
    password: Type.Optional(Type.String()),
    nextPassword: Type.String(),
  }),
  params: Type.Object({
    userId: Type.String(),
  }),
  response: {
    200: Type.Optional(Type.Object({})),
    400: Type.Object({
      code: Type.Optional(Type.String()),
      message: Type.Optional(Type.String()),
    }),
    403: Type.Optional(Type.Object({})),
  },
} as const;
type PostChangePw = typeof PostChangePw;
async function postChangePassword(
  req: FastifyRequestTypeBox<PostChangePw>,
  res: FastifyReplyTypeBox<typeof PostChangePw>
) {
  let ctxUser = req.ctx.getUser();
  /*
    ctxUser can change password if:
      1) ctxUser is the same user as the specified userId
      2) ctxUser has relevant permission(s)
  _*/
  let hasChangePwPerms = await authzService.checkPermission(ctxUser.user_id, 'user.mgmt');
  if((ctxUser.user_id !== req.params.userId) && !hasChangePwPerms) {
    return res.status(403).send();
  }
  if(!hasChangePwPerms) {
    /*
      Privileged users can set user passwords without knowing the current password
    _*/
    if(req.body.password === undefined) {
      return res.status(400).send({
        message: `Missing required 'password' param`,
      });
    }
    let checkPwRes = await userService.checkUserPassword(ctxUser.user_name, req.body.password);
    if(checkPwRes instanceof Error) {
      let err = checkPwRes;
      if(!(err instanceof EzdError)) {
        return res.status(400).send({
          message: 'Invalid current password',
        });
      }
      return res.status(400).send({
        code: err.code,
        message: err.message,
      });
    }
  }
  /*
    check new password is valid:
      1) pass normal password validation
      2) not equal to current password
  _*/
  let nextPw = req.body.nextPassword;
  let nextPwValid = inputFormats.checkPassword(nextPw);
  if(!nextPwValid) {
    return res.status(400).send({
      message: 'Invalid next password',
    });
  }
  let nextPwEqualsRes = await userService.checkUserPasswordByUserId(req.params.userId, nextPw);
  let pwMatch: boolean;
  if(nextPwEqualsRes instanceof EzdError) {
    if(!(nextPwEqualsRes instanceof InvalidPasswordError)) {
      return res.status(400).send({
        message: nextPwEqualsRes.message,
      });
    }
    pwMatch = false;
  } else {
    pwMatch = true;
  }
  if(pwMatch) {
    return res.status(400).send({
      message: 'Next password cannot be equal to current',
    });
  }
  await userService.changePassword(req.params.userId, nextPw);
  return res.status(200).send();
}
/*
  Exports
_*/
export const userAuthCtrl = {
  PostRegisterUserSchema: PostRegisterUserSchema,
  PostUserLoginSchema: PostUserLoginSchema,
  PostUserLogoutSchema: PostUserLogoutSchema,
  PostChangePw,

  postRegisterUser: postRegisterUser,
  postUserLogin: postUserLogin,
  postUserLogout: postUserLogout,
  postChangePassword,
} as const;
