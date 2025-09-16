
import { FastifyRequest, FastifyReply } from 'fastify';
import { UserLoginBodySchema } from '../../lib/models/user-login-body';
import { userService } from '../../lib/service/user-service';
import { UserDto } from '../../lib/models/user-dto';
import { EzdError } from '../../lib/models/error/ezd-error';
import { ezdErrorCodes } from '../../lib/models/error/ezd-error-codes';

export type PostUserLoginRequest = {
  Body: {
    userName?: string;
    password?: string;
  }
  Reply: {
    401?: {
      code?: string;
      message?: string;
    };
    200?: unknown;
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
  /*
  Check if user has a session login already
    If not, create one
  _*/
  if(!req.session.isSaved()) {
    /*
    The login db entry has a dependency on the session entity, so make sure it's saved.
      By default fastify/session saves _after_ the response is sent.
    _*/
    await req.session.save();
  }
  let loginRes = await userService.logInUser(user, req.session);
  /*
  TODO: return valid session info. Like JWT.
  _*/
  res.status(200).send();
  return res;
}
