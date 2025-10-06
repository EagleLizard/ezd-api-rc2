
import { FastifyRequest, FastifyReply } from 'fastify';
import { UserLoginBodySchema } from '../../lib/models/user-login-body';
import { userService } from '../../lib/service/user-service';
import { UserDto } from '../../lib/models/user-dto';
import { EzdError } from '../../lib/models/error/ezd-error';
import { ezdErrorCodes } from '../../lib/models/error/ezd-error-codes';

type PostUserLoginRequest = {
  Body: {
    userName?: string;
    password?: string;
  }
  Reply: {
    401?: {
      code?: string;
      message?: string;
    };
    200?: {
      user: UserDto
    };
  }
};

export async function postUserLogin(
  req: FastifyRequest<PostUserLoginRequest>,
  res: FastifyReply<PostUserLoginRequest>
) {
  let user: UserDto | Error | undefined;
  if(!UserLoginBodySchema.check(req.body)) {
    res.status(401).send({
      code: ezdErrorCodes.INVALID_LOG_IN_INPUT,
      message: 'Invalid username or password',
    });
    return res;
  }
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
    res.status(401);
    return;
  }
  req.session.user_id = user.user_id;
  /*
  TODO: return valid session info. Like JWT.
  _*/
  res.setCookie('ezd_user', user.user_name);
  res.status(200).send({
    user: user,
  });
  return res;
}
